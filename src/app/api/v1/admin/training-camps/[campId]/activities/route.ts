import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
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
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
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

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { campId } = trainingCampParam.parse(await params);
        const camp = await getTrainingCamp(campId);
        if (!camp) throw new ApiError(404, 'Training camp not found', 'not_found');

        const dto = trainingCampActivityCreateSchema.parse(await req.json());
        const row = await createTrainingCampActivity(campId, {
            name: dto.name.trim(),
            defaultMaxMarks: dto.defaultMaxMarks,
            sortOrder: dto.sortOrder ?? 0,
        });

        await req.audit.log({
            action: AuditEventType.TRAINING_CAMP_ACTIVITY_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.TRAINING_CAMP_ACTIVITY, id: row.id },
            metadata: {
                description: `Created training camp activity ${row.name}`,
                activityId: row.id,
                trainingCampId: campId,
                defaultMaxMarks: row.defaultMaxMarks,
            },
        });
        return json.created({ message: 'Training camp activity created successfully.', activity: row });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', GETHandler);

export const POST = withAuditRoute('POST', POSTHandler);
