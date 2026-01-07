import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { punishmentUpdateSchema } from '@/app/lib/validators.punishments';
import type { PunishmentRow } from '@/app/db/queries/punishments';
import {
    getPunishment,
    updatePunishment,
    softDeletePunishment,
    hardDeletePunishment,
} from '@/app/db/queries/punishments';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

const Id = z.object({ id: z.string().uuid() });

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAuth(req);
        const { id } = Id.parse(await params);
        const row = await getPunishment(id);
        if (!row) throw new ApiError(404, 'Punishment not found', 'not_found');
        return json.ok({ message: 'Punishment retrieved successfully.', punishment: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminCtx = await requireAdmin(req);
        const { id } = Id.parse(await params);
        const body = punishmentUpdateSchema.parse(await req.json());

        const patch: any = {};
        if (body.title !== undefined) patch.title = body.title;
        if (body.marksDeduction !== undefined) patch.marksDeduction = body.marksDeduction;

        const previous = await getPunishment(id);
        if (!previous) throw new ApiError(404, 'Punishment not found', 'not_found');

        const row = await updatePunishment(id, patch);
        if (!row) throw new ApiError(404, 'Punishment not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.PUNISHMENT_UPDATED,
            resourceType: AuditResourceType.PUNISHMENT,
            resourceId: row.id,
            description: `Updated punishment ${row.title}`,
            metadata: {
                punishmentId: row.id,
                changes: Object.keys(patch),
            },
            before: previous,
            after: row,
            changedFields: Object.keys(patch),
            request: req,
            required: true,
        });

        return json.ok({ message: 'Punishment updated successfully.', punishment: row });
    } catch (err) {
        return handleApiError(err);
    }
}

type PunishmentDeleteResult =
    | { before: PunishmentRow; after: PunishmentRow }
    | { before: PunishmentRow };

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminCtx = await requireAdmin(req);
        const { id } = Id.parse(await params);
        const hard = (new URL(req.url).searchParams.get('hard') || '').toLowerCase() === 'true';
        const result = (hard ? await hardDeletePunishment(id) : await softDeletePunishment(id)) as PunishmentDeleteResult | null;
        if (!result) throw new ApiError(404, 'Punishment not found', 'not_found');
        const before: PunishmentRow = result.before;
        let after: PunishmentRow | null = null;
        if ('after' in result) {
            after = result.after ?? null;
        }
        const resourceId = after?.id ?? before?.id ?? id;

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.PUNISHMENT_DELETED,
            resourceType: AuditResourceType.PUNISHMENT,
            resourceId,
            description: `${hard ? 'Hard' : 'Soft'} deleted punishment ${resourceId}`,
            metadata: {
                punishmentId: resourceId,
                hardDeleted: hard,
            },
            before: before ?? null,
            after: after ?? null,
            changedFields: hard ? undefined : ['deletedAt'],
            request: req,
            required: true,
        });

        return json.ok({
            message: hard ? 'Punishment hard-deleted.' : 'Punishment soft-deleted.',
            id: resourceId,
        });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);
