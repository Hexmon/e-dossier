import { json, handleApiError } from '@/app/lib/http';
import { mustBeAuthed, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam } from '@/app/lib/oc-validators';
import {
    olqSubtitleQuerySchema,
} from '@/app/lib/olq-validators';
import {
    getCourseTemplateCategories,
    getCourseTemplateSubtitles,
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
        if (!courseInfo) return json.notFound('OC not found');

        const sp = new URL(req.url).searchParams;
        const qp = olqSubtitleQuerySchema.parse({
            categoryId: sp.get('categoryId') ?? undefined,
            isActive: sp.get('isActive') ?? undefined,
        });

        const items = await getCourseTemplateSubtitles({
            courseId: courseInfo.courseId,
            categoryId: qp.categoryId,
            isActive: qp.isActive,
            fallbackToLegacyGlobal: false,
        });
        const activeCategories = (qp.isActive ?? true)
            ? await getCourseTemplateCategories({
                courseId: courseInfo.courseId,
                includeSubtitles: false,
                isActive: true,
                fallbackToLegacyGlobal: false,
            })
            : [];
        const templateMissing = (qp.isActive ?? true) && activeCategories.length === 0;
        const message = templateMissing
            ? 'OLQ template is not configured for this course. Contact admin.'
            : 'OLQ subtitles retrieved successfully.';

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: 'OLQ subtitles retrieved successfully.',
                ocId,
                module: 'olq_subtitles',
                categoryId: qp.categoryId,
                isActive: qp.isActive,
                count: items.length,
                templateMissing,
            },
        });

        return json.ok({
            message,
            items,
            count: items.length,
            templateMissing,
            templateScope: 'course',
            action: templateMissing ? 'contact_admin' : undefined,
        });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: 'Blocked OC-side OLQ subtitle write attempt.',
                module: 'olq_subtitles',
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
