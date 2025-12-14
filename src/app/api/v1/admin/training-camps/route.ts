import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import {
    trainingCampCreateSchema,
    trainingCampQuerySchema,
} from '@/app/lib/training-camp-validators';
import {
    listTrainingCamps,
    createTrainingCamp,
} from '@/app/db/queries/trainingCamps';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest) {
    try {
        await requireAuth(req);
        const sp = new URL(req.url).searchParams;
        const qp = trainingCampQuerySchema.parse({
            semester: sp.get('semester') ?? undefined,
            includeActivities: sp.get('includeActivities') ?? undefined,
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });

        const items = await listTrainingCamps({
            semester: qp.semester,
            includeActivities: qp.includeActivities ?? false,
            includeDeleted: qp.includeDeleted ?? false,
        });

        return json.ok({ message: 'Training camps retrieved successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: NextRequest) {
    try {
        const adminCtx = await requireAdmin(req);
        const dto = trainingCampCreateSchema.parse(await req.json());
        const row = await createTrainingCamp({
            name: dto.name.trim(),
            semester: dto.semester,
            maxTotalMarks: dto.maxTotalMarks,
        });

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.TRAINING_CAMP_CREATED,
            resourceType: AuditResourceType.TRAINING_CAMP,
            resourceId: row.id,
            description: `Created training camp ${row.name}`,
            metadata: {
                trainingCampId: row.id,
                semester: row.semester,
                maxTotalMarks: row.maxTotalMarks,
            },
            request: req,
        });
        return json.created({ message: 'Training camp created successfully.', trainingCamp: row });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withRouteLogging('GET', GETHandler);

export const POST = withRouteLogging('POST', POSTHandler);
