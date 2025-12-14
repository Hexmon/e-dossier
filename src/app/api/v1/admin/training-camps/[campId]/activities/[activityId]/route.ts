import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import {
    trainingCampActivityParam,
    trainingCampActivityUpdateSchema,
} from '@/app/lib/training-camp-validators';
import {
    getTrainingCampActivity,
    updateTrainingCampActivity,
    deleteTrainingCampActivity,
} from '@/app/db/queries/trainingCamps';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await requireAuth(req);
        const { activityId } = trainingCampActivityParam.parse(await params);
        const row = await getTrainingCampActivity(activityId);
        if (!row) throw new ApiError(404, 'Training camp activity not found', 'not_found');
        return json.ok({ message: 'Training camp activity retrieved successfully.', activity: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAdmin(req);
        const { activityId } = trainingCampActivityParam.parse(await params);
        const dto = trainingCampActivityUpdateSchema.parse(await req.json());
        const row = await updateTrainingCampActivity(activityId, { ...dto });
        if (!row) throw new ApiError(404, 'Training camp activity not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.TRAINING_CAMP_ACTIVITY_UPDATED,
            resourceType: AuditResourceType.TRAINING_CAMP_ACTIVITY,
            resourceId: row.id,
            description: `Updated training camp activity ${row.name}`,
            metadata: {
                activityId: row.id,
                trainingCampId: row.trainingCampId,
                changes: Object.keys(dto),
            },
            request: req,
        });
        return json.ok({ message: 'Training camp activity updated successfully.', activity: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAdmin(req);
        const { activityId } = trainingCampActivityParam.parse(await params);
        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deleteTrainingCampActivity(activityId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'Training camp activity not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.TRAINING_CAMP_ACTIVITY_DELETED,
            resourceType: AuditResourceType.TRAINING_CAMP_ACTIVITY,
            resourceId: row.id,
            description: `${body?.hard ? 'Hard' : 'Soft'} deleted training camp activity ${activityId}`,
            metadata: {
                activityId: row.id,
                trainingCampId: row.trainingCampId,
                hardDeleted: body?.hard === true,
            },
            request: req,
        });
        return json.ok({ message: 'Training camp activity deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withRouteLogging('GET', GETHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);
