import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam } from '@/app/lib/oc-validators';
import {
    olqCategoryQuerySchema,
} from '@/app/lib/olq-validators';
import {
    getCourseTemplateCategories,
} from '@/app/db/queries/olq';
import { getOcCourseInfo } from '@/app/db/queries/oc';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);
        const courseInfo = await getOcCourseInfo(ocId);
        if (!courseInfo) throw new ApiError(404, 'OC not found', 'not_found');

        const sp = new URL(req.url).searchParams;
        const qp = olqCategoryQuerySchema.parse({
            includeSubtitles: sp.get('includeSubtitles') ?? undefined,
            isActive: sp.get('isActive') ?? undefined,
        });

        const items = await getCourseTemplateCategories({
            courseId: courseInfo.courseId,
            includeSubtitles: qp.includeSubtitles ?? false,
            isActive: qp.isActive,
            fallbackToLegacyGlobal: true,
        });

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: 'OLQ categories retrieved successfully.',
                ocId,
                module: 'olq_categories',
                includeSubtitles: qp.includeSubtitles ?? false,
                isActive: qp.isActive,
                count: items.length,
            },
        });

        return json.ok({ message: 'OLQ categories retrieved successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: 'Blocked OC-side OLQ category write attempt.',
                module: 'olq_categories',
                blocked: true,
            },
        });
        return json.forbidden('OLQ template updates are admin-only. Use /api/v1/admin/olq/... endpoints.');
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', GETHandler);

export const POST = withAuditRoute('POST', POSTHandler);
