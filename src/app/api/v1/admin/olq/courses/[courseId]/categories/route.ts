import { z } from 'zod';
import { requireAdmin } from '@/app/lib/authz';
import { json, handleApiError } from '@/app/lib/http';
import {
    olqCategoryCreateSchema,
    olqCategoryQuerySchema,
} from '@/app/lib/olq-validators';
import {
    createOlqCategory,
    listOlqCategories,
} from '@/app/db/queries/olq';
import {
    AuditEventType,
    AuditResourceType,
    type AuditNextRequest,
    withAuditRoute,
} from '@/lib/audit';

export const runtime = 'nodejs';

const CourseIdParam = z.object({ courseId: z.string().uuid() });

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ courseId: string }> }) {
    try {
        const auth = await requireAdmin(req);
        const { courseId } = CourseIdParam.parse(await params);
        const sp = new URL(req.url).searchParams;
        const qp = olqCategoryQuerySchema.parse({
            includeSubtitles: sp.get('includeSubtitles') ?? undefined,
            isActive: sp.get('isActive') ?? undefined,
        });

        const items = await listOlqCategories({
            courseId,
            includeSubtitles: qp.includeSubtitles ?? false,
            isActive: qp.isActive,
        });

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: auth.userId },
            target: { type: AuditResourceType.COURSE, id: courseId },
            metadata: {
                description: `Admin fetched OLQ categories for course ${courseId}`,
                module: 'admin_olq_categories',
                includeSubtitles: qp.includeSubtitles ?? false,
                isActive: qp.isActive,
                count: items.length,
            },
        });

        return json.ok({ message: 'OLQ categories retrieved successfully.', items, count: items.length });
    } catch (error) {
        return handleApiError(error);
    }
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ courseId: string }> }) {
    try {
        const auth = await requireAdmin(req);
        const { courseId } = CourseIdParam.parse(await params);
        const dto = olqCategoryCreateSchema.parse(await req.json());
        const row = await createOlqCategory(courseId, {
            code: dto.code.trim(),
            title: dto.title.trim(),
            description: dto.description ?? null,
            displayOrder: dto.displayOrder ?? 0,
            isActive: dto.isActive ?? true,
        });

        await req.audit.log({
            action: AuditEventType.OC_RECORD_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: auth.userId },
            target: { type: AuditResourceType.COURSE, id: courseId },
            metadata: {
                description: `Admin created OLQ category ${row.id} for course ${courseId}`,
                module: 'admin_olq_categories',
                categoryId: row.id,
                code: row.code,
            },
        });

        return json.created({ message: 'OLQ category created successfully.', category: row });
    } catch (error: any) {
        const pgCode = error?.code ?? error?.cause?.code;
        if (pgCode === '23505') {
            return json.conflict('Category code already exists for this course.');
        }
        return handleApiError(error);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const POST = withAuditRoute('POST', POSTHandler);
