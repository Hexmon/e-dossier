import { z } from 'zod';
import { requireAdmin } from '@/app/lib/authz';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import {
    olqCategoryUpdateSchema,
    olqCategoryQuerySchema,
} from '@/app/lib/olq-validators';
import {
    getOlqCategory,
    updateOlqCategory,
    deleteOlqCategory,
} from '@/app/db/queries/olq';
import {
    AuditEventType,
    AuditResourceType,
    type AuditNextRequest,
    withAuditRoute,
} from '@/lib/audit';

export const runtime = 'nodejs';

const ParamsSchema = z.object({
    courseId: z.string().uuid(),
    categoryId: z.string().uuid(),
});

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ courseId: string; categoryId: string }> }) {
    try {
        const auth = await requireAdmin(req);
        const { courseId, categoryId } = ParamsSchema.parse(await params);
        const sp = new URL(req.url).searchParams;
        const qp = olqCategoryQuerySchema.parse({
            includeSubtitles: sp.get('includeSubtitles') ?? undefined,
        });

        const row = await getOlqCategory(courseId, categoryId, qp.includeSubtitles ?? false);
        if (!row) throw new ApiError(404, 'Category not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: auth.userId },
            target: { type: AuditResourceType.COURSE, id: courseId },
            metadata: {
                description: `Admin fetched OLQ category ${categoryId} for course ${courseId}`,
                module: 'admin_olq_categories',
                categoryId,
            },
        });

        return json.ok({ message: 'OLQ category retrieved successfully.', category: row });
    } catch (error) {
        return handleApiError(error);
    }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ courseId: string; categoryId: string }> }) {
    try {
        const auth = await requireAdmin(req);
        const { courseId, categoryId } = ParamsSchema.parse(await params);
        const dto = olqCategoryUpdateSchema.parse(await req.json());
        const row = await updateOlqCategory(courseId, categoryId, dto);
        if (!row) throw new ApiError(404, 'Category not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.OC_RECORD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: auth.userId },
            target: { type: AuditResourceType.COURSE, id: courseId },
            metadata: {
                description: `Admin updated OLQ category ${categoryId} for course ${courseId}`,
                module: 'admin_olq_categories',
                categoryId,
                changes: Object.keys(dto),
            },
        });

        return json.ok({ message: 'OLQ category updated successfully.', category: row });
    } catch (error: any) {
        const pgCode = error?.code ?? error?.cause?.code;
        if (pgCode === '23505') {
            return json.conflict('Category code already exists for this course.');
        }
        return handleApiError(error);
    }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ courseId: string; categoryId: string }> }) {
    try {
        const auth = await requireAdmin(req);
        const { courseId, categoryId } = ParamsSchema.parse(await params);
        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deleteOlqCategory(courseId, categoryId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'Category not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.OC_RECORD_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: auth.userId },
            target: { type: AuditResourceType.COURSE, id: courseId },
            metadata: {
                description: `Admin deleted OLQ category ${categoryId} for course ${courseId}`,
                module: 'admin_olq_categories',
                categoryId,
                hardDeleted: body?.hard === true,
            },
        });

        return json.ok({
            message: 'OLQ category deleted successfully.',
            deleted: row.id,
            hardDeleted: body?.hard === true,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const PATCH = withAuditRoute('PATCH', PATCHHandler);
export const DELETE = withAuditRoute('DELETE', DELETEHandler);
