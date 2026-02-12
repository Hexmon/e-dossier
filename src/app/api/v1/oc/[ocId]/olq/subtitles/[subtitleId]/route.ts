import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { olqSubtitleUpdateSchema } from '@/app/lib/olq-validators';
import { getOlqSubtitle, updateOlqSubtitle, deleteOlqSubtitle } from '@/app/db/queries/olq';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

const SubtitleIdParam = z.object({ subtitleId: z.string().uuid() });

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await requireAuth(req);
        const parsed = SubtitleIdParam.parse(await params);
        const row = await getOlqSubtitle(parsed.subtitleId);
        if (!row) throw new ApiError(404, 'Subtitle not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: (await params).ocId },
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
        const adminCtx = await requireAuth(req);
        const parsed = SubtitleIdParam.parse(await params);
        const dto = olqSubtitleUpdateSchema.parse(await req.json());
        const row = await updateOlqSubtitle(parsed.subtitleId, { ...dto });
        if (!row) throw new ApiError(404, 'Subtitle not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.OC_RECORD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: (await params).ocId },
            metadata: {
                description: `Updated OLQ subtitle ${parsed.subtitleId}`,
                module: 'olq_subtitles',
                subtitleId: parsed.subtitleId,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'OLQ subtitle updated successfully.', subtitle: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const parsed = SubtitleIdParam.parse(await params);
        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deleteOlqSubtitle(parsed.subtitleId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'Subtitle not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.OC_RECORD_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: (await params).ocId },
            metadata: {
                description: `Deleted OLQ subtitle ${parsed.subtitleId}`,
                module: 'olq_subtitles',
                subtitleId: parsed.subtitleId,
                hardDeleted: body?.hard === true,
            },
        });
        return json.ok({ message: 'OLQ subtitle deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', GETHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
