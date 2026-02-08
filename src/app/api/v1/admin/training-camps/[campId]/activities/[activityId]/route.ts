import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import {
    trainingCampActivityParam,
    trainingCampActivityUpdateSchema,
} from '@/app/lib/training-camp-validators';
import {
    getTrainingCampActivity,
    updateTrainingCampActivity,
    deleteTrainingCampActivity,
} from '@/app/db/queries/trainingCamps';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
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

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { activityId } = trainingCampActivityParam.parse(await params);
        const dto = trainingCampActivityUpdateSchema.parse(await req.json());
        const row = await updateTrainingCampActivity(activityId, { ...dto });
        if (!row) throw new ApiError(404, 'Training camp activity not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.TRAINING_CAMP_ACTIVITY_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.TRAINING_CAMP_ACTIVITY, id: row.id },
            metadata: {
                description: `Updated training camp activity ${row.name}`,
                activityId: row.id,
                trainingCampId: row.trainingCampId,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'Training camp activity updated successfully.', activity: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { activityId } = trainingCampActivityParam.parse(await params);
        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deleteTrainingCampActivity(activityId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'Training camp activity not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.TRAINING_CAMP_ACTIVITY_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.TRAINING_CAMP_ACTIVITY, id: row.id },
            metadata: {
                description: `${body?.hard ? 'Hard' : 'Soft'} deleted training camp activity ${activityId}`,
                activityId: row.id,
                trainingCampId: row.trainingCampId,
                hardDeleted: body?.hard === true,
            },
        });
        return json.ok({ message: 'Training camp activity deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', GETHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
