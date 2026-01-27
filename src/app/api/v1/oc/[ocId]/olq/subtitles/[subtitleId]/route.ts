import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { olqSubtitleUpdateSchema } from '@/app/lib/olq-validators';
import { getOlqSubtitle, updateOlqSubtitle, deleteOlqSubtitle } from '@/app/db/queries/olq';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

const SubtitleIdParam = z.object({ subtitleId: z.string().uuid() });

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await requireAuth(req);
        const { subtitleId } = SubtitleIdParam.parse(await params);
        const row = await getOlqSubtitle(subtitleId);
        if (!row) throw new ApiError(404, 'Subtitle not found', 'not_found');
        return json.ok({ message: 'OLQ subtitle retrieved successfully.', subtitle: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { subtitleId } = SubtitleIdParam.parse(await params);
        const dto = olqSubtitleUpdateSchema.parse(await req.json());
        const row = await updateOlqSubtitle(subtitleId, { ...dto });
        if (!row) throw new ApiError(404, 'Subtitle not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.OC_RECORD_UPDATED,
            resourceType: AuditResourceType.OC,
            resourceId: null,
            description: `Updated OLQ subtitle ${subtitleId}`,
            metadata: {
                module: 'olq_subtitles',
                subtitleId,
                changes: Object.keys(dto),
            },
            request: req,
        });
        return json.ok({ message: 'OLQ subtitle updated successfully.', subtitle: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { subtitleId } = SubtitleIdParam.parse(await params);
        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deleteOlqSubtitle(subtitleId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'Subtitle not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.OC_RECORD_DELETED,
            resourceType: AuditResourceType.OC,
            resourceId: null,
            description: `Deleted OLQ subtitle ${subtitleId}`,
            metadata: {
                module: 'olq_subtitles',
                subtitleId,
                hardDeleted: body?.hard === true,
            },
            request: req,
        });
        return json.ok({ message: 'OLQ subtitle deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withRouteLogging('GET', GETHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);
