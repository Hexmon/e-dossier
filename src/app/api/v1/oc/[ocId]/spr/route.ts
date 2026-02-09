import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { parseParam, ensureOcExists, mustBeAuthed } from '../../_checks';
import { OcIdParam } from '@/app/lib/oc-validators';
import { authorizeOcAccess } from '@/lib/authorization';
import { withRouteLogging } from '@/lib/withRouteLogging';
import { sprQuerySchema, sprUpsertSchema, normalizeSubjectRemarks } from '@/app/lib/performance-record-validators';
import { getSprView, upsertSprView } from '@/app/services/oc-performance-records';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);
        await authorizeOcAccess(req, ocId);

        const sp = new URL(req.url).searchParams;
        const qp = sprQuerySchema.parse({ semester: sp.get('semester') ?? undefined });
        const data = await getSprView(ocId, qp.semester);
        return json.ok({ message: 'SPR retrieved successfully.', ...data });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTOrPATCHHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const auth = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);
        await authorizeOcAccess(req, ocId);

        const sp = new URL(req.url).searchParams;
        const qp = sprQuerySchema.parse({ semester: sp.get('semester') ?? undefined });
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

export const GET = withRouteLogging('GET', GETHandler);
export const POST = withRouteLogging('POST', POSTOrPATCHHandler);
export const PATCH = withRouteLogging('PATCH', POSTOrPATCHHandler);
