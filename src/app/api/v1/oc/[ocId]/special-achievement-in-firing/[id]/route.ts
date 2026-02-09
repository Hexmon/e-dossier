import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, specialAchievementInFiringUpdateSchema } from '@/app/lib/oc-validators';
import { getSpecialAchievementInFiring, updateSpecialAchievementInFiring, deleteSpecialAchievementInFiring } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const row = await getSpecialAchievementInFiring(ocId, id);
        if (!row) throw new ApiError(404, 'Special achievement record not found', 'not_found');
        return json.ok({ message: 'Special achievement in firing retrieved successfully.', data: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const dto = specialAchievementInFiringUpdateSchema.parse(await req.json());
        const row = await updateSpecialAchievementInFiring(ocId, id, dto);
        if (!row) throw new ApiError(404, 'Special achievement record not found', 'not_found');

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_UPDATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Updated special achievement in firing ${row.id} for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'special_achievement_in_firing',
                recordId: row.id,
                changes: Object.keys(dto),
            },
            request: req,
        });
        return json.ok({ message: 'Special achievement in firing updated successfully.', data: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const sp = new URL(req.url).searchParams;
        const hard = sp.get('hard') === 'true';
        const row = await deleteSpecialAchievementInFiring(ocId, id, { hard });
        if (!row) throw new ApiError(404, 'Special achievement record not found', 'not_found');

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_DELETED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `${hard ? 'Hard' : 'Soft'} deleted special achievement in firing ${id} for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'special_achievement_in_firing',
                recordId: row.id,
                hardDeleted: hard,
            },
            request: req,
        });
        return json.ok({
            message: hard ? 'Special achievement in firing hard-deleted.' : 'Special achievement in firing soft-deleted.',
            id: row.id,
        });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withRouteLogging('GET', GETHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);
