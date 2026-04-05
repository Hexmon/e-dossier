import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { parseParam, ensureOcExists, mustBeAuthed, assertOcSemesterWriteAllowed } from '../../_checks';
import { OcIdParam } from '@/app/lib/oc-validators';
import { readSemesterSearchParam } from '@/lib/dossier-semester';
import { sprQuerySchema, sprUpsertSchema, normalizeSubjectRemarks } from '@/app/lib/performance-record-validators';
import { getSprView, upsertSprView } from '@/app/services/oc-performance-records';
import { withAuditRoute } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        const sp = new URL(req.url).searchParams;
        const qp = sprQuerySchema.parse({ semester: readSemesterSearchParam(sp) });
        const data = await getSprView(ocId, qp.semester);
        return json.ok({ message: 'SPR retrieved successfully.', ...data });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTOrPATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const auth = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        const sp = new URL(req.url).searchParams;
        const qp = sprQuerySchema.parse({ semester: readSemesterSearchParam(sp) });
        await assertOcSemesterWriteAllowed({ ocId, requestedSemester: qp.semester, request: req, authContext: auth });
        const dto = sprUpsertSchema.parse(await req.json());

        const data = await upsertSprView(
            ocId,
            qp.semester,
            {
                cdrMarks: dto.cdrMarks,
                subjectRemarks: normalizeSubjectRemarks(dto.subjectRemarks),
                performanceReportRemarks: dto.performanceReportRemarks,
            },
            { actorUserId: auth.userId, request: req },
        );

        return json.ok({ message: 'SPR upserted successfully.', ...data });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const POST = withAuditRoute('POST', POSTOrPATCHHandler);
export const PATCH = withAuditRoute('PATCH', POSTOrPATCHHandler);
