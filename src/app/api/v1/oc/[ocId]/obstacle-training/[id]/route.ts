import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, obstacleTrainingUpdateSchema } from '@/app/lib/oc-validators';
import { getObstacleTraining, updateObstacleTraining, deleteObstacleTraining } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const row = await getObstacleTraining(ocId, id);
        if (!row) throw new ApiError(404, 'Obstacle training record not found', 'not_found');
        return json.ok({ message: 'Obstacle training record retrieved successfully.', data: row });
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
        const dto = obstacleTrainingUpdateSchema.parse(await req.json());
        const row = await updateObstacleTraining(ocId, id, dto);
        if (!row) throw new ApiError(404, 'Obstacle training record not found', 'not_found');

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_UPDATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Updated obstacle training record ${row.id} for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'obstacle_training',
                recordId: row.id,
                changes: Object.keys(dto),
            },
            request: req,
        });
        return json.ok({ message: 'Obstacle training record updated successfully.', data: row });
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
        const row = await deleteObstacleTraining(ocId, id, { hard });
        if (!row) throw new ApiError(404, 'Obstacle training record not found', 'not_found');

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_DELETED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `${hard ? 'Hard' : 'Soft'} deleted obstacle training record ${id} for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'obstacle_training',
                recordId: row.id,
                hardDeleted: hard,
            },
            request: req,
        });
        return json.ok({
            message: hard ? 'Obstacle training record hard-deleted.' : 'Obstacle training record soft-deleted.',
            id: row.id,
        });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withRouteLogging('GET', GETHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);
