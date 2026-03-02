import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, parseParam, ensureOcExists } from '../../../../_checks';
import { OcIdParam } from '@/app/lib/oc-validators';
import { getOlqSubtitle } from '@/app/db/queries/olq';
import { getOcCourseInfo } from '@/app/db/queries/oc';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

const SubtitleIdParam = z.object({ subtitleId: z.string().uuid() });

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);
        const courseInfo = await getOcCourseInfo(ocId);
        if (!courseInfo) throw new ApiError(404, 'OC not found', 'not_found');
        const parsed = SubtitleIdParam.parse(await params);
        const row = await getOlqSubtitle(courseInfo.courseId, parsed.subtitleId);
        if (!row) throw new ApiError(404, 'Subtitle not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `OLQ subtitle ${parsed.subtitleId} retrieved successfully.`,
                module: 'olq_subtitles',
                subtitleId: parsed.subtitleId,
            },
        });

        return json.ok({ message: 'OLQ subtitle retrieved successfully.', subtitle: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);
        const parsed = SubtitleIdParam.parse(await params);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Blocked OC-side OLQ subtitle update ${parsed.subtitleId}`,
                module: 'olq_subtitles',
                subtitleId: parsed.subtitleId,
                blocked: true,
            },
        });
        return json.forbidden('OLQ template updates are admin-only. Use /api/v1/admin/olq/... endpoints.');
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);
        const parsed = SubtitleIdParam.parse(await params);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Blocked OC-side OLQ subtitle delete ${parsed.subtitleId}`,
                module: 'olq_subtitles',
                subtitleId: parsed.subtitleId,
                blocked: true,
            },
        });
        return json.forbidden('OLQ template updates are admin-only. Use /api/v1/admin/olq/... endpoints.');
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', GETHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
