import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, parseParam, ensureOcExists } from '../../../../_checks';
import { OcIdParam } from '@/app/lib/oc-validators';
import {
    olqCategoryQuerySchema,
} from '@/app/lib/olq-validators';
import {
    getOlqCategory,
} from '@/app/db/queries/olq';
import { getOcCourseInfo } from '@/app/db/queries/oc';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

const CategoryIdParam = z.object({ categoryId: z.string().uuid() });

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);
        const { categoryId } = await parseParam({ params }, CategoryIdParam);
        const courseInfo = await getOcCourseInfo(ocId);
        if (!courseInfo) throw new ApiError(404, 'OC not found', 'not_found');

        const sp = new URL(req.url).searchParams;
        const qp = olqCategoryQuerySchema.parse({
            includeSubtitles: sp.get('includeSubtitles') ?? undefined,
        });

        const row = await getOlqCategory(courseInfo.courseId, categoryId, qp.includeSubtitles ?? false);
        if (!row) throw new ApiError(404, 'Category not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `OLQ category ${categoryId} retrieved successfully.`,
                module: 'olq_categories',
                categoryId,
                includeSubtitles: qp.includeSubtitles ?? false,
            },
        });

        return json.ok({ message: 'OLQ category retrieved successfully.', category: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);
        const { categoryId } = await parseParam({ params }, CategoryIdParam);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Blocked OC-side OLQ category update ${categoryId}`,
                module: 'olq_categories',
                categoryId,
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
        const { categoryId } = await parseParam({ params }, CategoryIdParam);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Blocked OC-side OLQ category delete ${categoryId}`,
                module: 'olq_categories',
                categoryId,
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
