import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import {
    trainingCampParam,
    trainingCampUpdateSchema,
    trainingCampQuerySchema,
} from '@/app/lib/training-camp-validators';
import {
    getTrainingCamp,
    updateTrainingCamp,
    deleteTrainingCamp,
} from '@/app/db/queries/trainingCamps';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await requireAuth(req);
        const { campId } = trainingCampParam.parse(await params);
        const sp = new URL(req.url).searchParams;
        const qp = trainingCampQuerySchema.parse({
            includeActivities: sp.get('includeActivities') ?? undefined,
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });

        const row = await getTrainingCamp(campId, qp.includeActivities ?? false, qp.includeDeleted ?? false);
        if (!row) throw new ApiError(404, 'Training camp not found', 'not_found');
        return json.ok({ message: 'Training camp retrieved successfully.', trainingCamp: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { campId } = trainingCampParam.parse(await params);
        const dto = trainingCampUpdateSchema.parse(await req.json());
        const row = await updateTrainingCamp(campId, { ...dto });
        if (!row) throw new ApiError(404, 'Training camp not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.TRAINING_CAMP_UPDATED,
            resourceType: AuditResourceType.TRAINING_CAMP,
            resourceId: row.id,
            description: `Updated training camp ${row.name}`,
            metadata: {
                trainingCampId: row.id,
                changes: Object.keys(dto),
            },
            request: req,
        });
        return json.ok({ message: 'Training camp updated successfully.', trainingCamp: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { campId } = trainingCampParam.parse(await params);
        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deleteTrainingCamp(campId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'Training camp not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.TRAINING_CAMP_DELETED,
            resourceType: AuditResourceType.TRAINING_CAMP,
            resourceId: row.id,
            description: `${body?.hard ? 'Hard' : 'Soft'} deleted training camp ${campId}`,
            metadata: {
                trainingCampId: row.id,
                hardDeleted: body?.hard === true,
            },
            request: req,
        });
        return json.ok({ message: 'Training camp deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withRouteLogging('GET', GETHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);
