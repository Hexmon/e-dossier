import { z } from 'zod';
import { requireAdmin } from '@/app/lib/authz';
import { json, handleApiError } from '@/app/lib/http';
import {
    olqSubtitleCreateSchema,
    olqSubtitleQuerySchema,
} from '@/app/lib/olq-validators';
import {
    createOlqSubtitle,
    listOlqSubtitles,
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
        const qp = olqSubtitleQuerySchema.parse({
            categoryId: sp.get('categoryId') ?? undefined,
            isActive: sp.get('isActive') ?? undefined,
        });

        const items = await listOlqSubtitles({
            courseId,
            categoryId: qp.categoryId,
            isActive: qp.isActive,
        });

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: auth.userId },
            target: { type: AuditResourceType.COURSE, id: courseId },
            metadata: {
                description: `Admin fetched OLQ subtitles for course ${courseId}`,
                module: 'admin_olq_subtitles',
                categoryId: qp.categoryId ?? null,
                count: items.length,
            },
        });

        return json.ok({ message: 'OLQ subtitles retrieved successfully.', items, count: items.length });
    } catch (error) {
        return handleApiError(error);
    }
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ courseId: string }> }) {
    try {
        const auth = await requireAdmin(req);
        const { courseId } = CourseIdParam.parse(await params);
        const dto = olqSubtitleCreateSchema.parse(await req.json());
        const row = await createOlqSubtitle(courseId, {
            categoryId: dto.categoryId,
            subtitle: dto.subtitle.trim(),
            maxMarks: dto.maxMarks ?? 20,
            displayOrder: dto.displayOrder ?? 0,
            isActive: dto.isActive ?? true,
        });

        await req.audit.log({
            action: AuditEventType.OC_RECORD_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: auth.userId },
            target: { type: AuditResourceType.COURSE, id: courseId },
            metadata: {
                description: `Admin created OLQ subtitle ${row.id} for course ${courseId}`,
                module: 'admin_olq_subtitles',
                subtitleId: row.id,
                categoryId: row.categoryId,
            },
        });

        return json.created({ message: 'OLQ subtitle created successfully.', subtitle: row });
    } catch (error) {
        return handleApiError(error);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const POST = withAuditRoute('POST', POSTHandler);
