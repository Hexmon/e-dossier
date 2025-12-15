import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import {
    trainingCampParam,
    trainingCampActivityCreateSchema,
    trainingCampActivityQuerySchema,
} from '@/app/lib/training-camp-validators';
import {
    listTrainingCampActivities,
    createTrainingCampActivity,
    getTrainingCamp,
} from '@/app/db/queries/trainingCamps';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await requireAuth(req);
        const { campId } = trainingCampParam.parse(await params);

        const sp = new URL(req.url).searchParams;
        const qp = trainingCampActivityQuerySchema.parse({
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });

        const activities = await listTrainingCampActivities(campId, { includeDeleted: qp.includeDeleted ?? false });
        return json.ok({ message: 'Training camp activities retrieved successfully.', items: activities, count: activities.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAdmin(req);
        const { campId } = trainingCampParam.parse(await params);
        const camp = await getTrainingCamp(campId);
        if (!camp) throw new ApiError(404, 'Training camp not found', 'not_found');

        const dto = trainingCampActivityCreateSchema.parse(await req.json());
        const row = await createTrainingCampActivity(campId, {
            name: dto.name.trim(),
            defaultMaxMarks: dto.defaultMaxMarks,
            sortOrder: dto.sortOrder ?? 0,
        });

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.TRAINING_CAMP_ACTIVITY_CREATED,
            resourceType: AuditResourceType.TRAINING_CAMP_ACTIVITY,
            resourceId: row.id,
            description: `Created training camp activity ${row.name}`,
            metadata: {
                activityId: row.id,
                trainingCampId: campId,
                defaultMaxMarks: row.defaultMaxMarks,
            },
            request: req,
        });
        return json.created({ message: 'Training camp activity created successfully.', activity: row });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withRouteLogging('GET', GETHandler);

export const POST = withRouteLogging('POST', POSTHandler);
