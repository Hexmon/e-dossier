import { z } from 'zod';

export const runtime = 'nodejs';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { punishmentUpdateSchema } from '@/app/lib/validators.punishments';
import type { PunishmentRow } from '@/app/db/queries/punishments';
import {
    getPunishment,
    updatePunishment,
    softDeletePunishment,
    hardDeletePunishment,
} from '@/app/db/queries/punishments';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

const Id = z.object({ id: z.string().uuid() });

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authCtx = await requireAuth(req);
        const { id } = Id.parse(await params);
        const row = await getPunishment(id);
        if (!row) throw new ApiError(404, 'Punishment not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.PUNISHMENT, id: row.id },
            metadata: {
                description: `Punishment ${row.id} retrieved successfully.`,
                punishmentId: row.id,
            },
        });
        return json.ok({ message: 'Punishment retrieved successfully.', punishment: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { id } = Id.parse(await params);
        const body = punishmentUpdateSchema.parse(await req.json());

        const patch: any = {};
        if (body.title !== undefined) patch.title = body.title;
        if (body.marksDeduction !== undefined) patch.marksDeduction = body.marksDeduction;

        const previous = await getPunishment(id);
        if (!previous) throw new ApiError(404, 'Punishment not found', 'not_found');

        const row = await updatePunishment(id, patch);
        if (!row) throw new ApiError(404, 'Punishment not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.PUNISHMENT_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PUNISHMENT, id: row.id },
            metadata: {
                description: `Updated punishment ${row.title}`,
                punishmentId: row.id,
                changes: Object.keys(patch),
            },
            diff: { before: previous, after: row },
        });

        return json.ok({ message: 'Punishment updated successfully.', punishment: row });
    } catch (err) {
        return handleApiError(err);
    }
}

type PunishmentDeleteResult =
    | { before: PunishmentRow; after: PunishmentRow }
    | { before: PunishmentRow };

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
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

        await req.audit.log({
            action: AuditEventType.PUNISHMENT_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PUNISHMENT, id: resourceId },
            metadata: {
                description: `${hard ? 'Hard' : 'Soft'} deleted punishment ${resourceId}`,
                punishmentId: resourceId,
                hardDeleted: hard,
                changedFields: hard ? [] : ['deletedAt'],
            },
            diff: { before: before ?? undefined, after: after ?? undefined },
        });

        return json.ok({
            message: hard ? 'Punishment hard-deleted.' : 'Punishment soft-deleted.',
            id: resourceId,
        });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));

export const PATCH = withAuditRoute('PATCH', withAuthz(PATCHHandler));

export const DELETE = withAuditRoute('DELETE', withAuthz(DELETEHandler));
