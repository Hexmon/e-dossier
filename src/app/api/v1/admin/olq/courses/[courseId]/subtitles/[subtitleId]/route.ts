import { z } from 'zod';
import { requireAdmin } from '@/app/lib/authz';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { olqSubtitleUpdateSchema } from '@/app/lib/olq-validators';
import {
    getOlqSubtitle,
    updateOlqSubtitle,
    deleteOlqSubtitle,
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
    subtitleId: z.string().uuid(),
});

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ courseId: string; subtitleId: string }> }) {
    try {
        const auth = await requireAdmin(req);
        const { courseId, subtitleId } = ParamsSchema.parse(await params);
        const row = await getOlqSubtitle(courseId, subtitleId);
        if (!row) throw new ApiError(404, 'Subtitle not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: auth.userId },
            target: { type: AuditResourceType.COURSE, id: courseId },
            metadata: {
                description: `Admin fetched OLQ subtitle ${subtitleId} for course ${courseId}`,
                module: 'admin_olq_subtitles',
                subtitleId,
            },
        });

        return json.ok({ message: 'OLQ subtitle retrieved successfully.', subtitle: row });
    } catch (error) {
        return handleApiError(error);
    }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ courseId: string; subtitleId: string }> }) {
    try {
        const auth = await requireAdmin(req);
        const { courseId, subtitleId } = ParamsSchema.parse(await params);
        const dto = olqSubtitleUpdateSchema.parse(await req.json());
        const row = await updateOlqSubtitle(courseId, subtitleId, dto);
        if (!row) throw new ApiError(404, 'Subtitle not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.OC_RECORD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: auth.userId },
            target: { type: AuditResourceType.COURSE, id: courseId },
            metadata: {
                description: `Admin updated OLQ subtitle ${subtitleId} for course ${courseId}`,
                module: 'admin_olq_subtitles',
                subtitleId,
                changes: Object.keys(dto),
            },
        });

        return json.ok({ message: 'OLQ subtitle updated successfully.', subtitle: row });
    } catch (error) {
        return handleApiError(error);
    }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ courseId: string; subtitleId: string }> }) {
    try {
        const auth = await requireAdmin(req);
        const { courseId, subtitleId } = ParamsSchema.parse(await params);
        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deleteOlqSubtitle(courseId, subtitleId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'Subtitle not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.OC_RECORD_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: auth.userId },
            target: { type: AuditResourceType.COURSE, id: courseId },
            metadata: {
                description: `Admin deleted OLQ subtitle ${subtitleId} for course ${courseId}`,
                module: 'admin_olq_subtitles',
                subtitleId,
                hardDeleted: body?.hard === true,
            },
        });

        return json.ok({
            message: 'OLQ subtitle deleted successfully.',
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
