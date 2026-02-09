import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import {
    trainingCampCreateSchema,
    trainingCampQuerySchema,
} from '@/app/lib/training-camp-validators';
import {
    listTrainingCamps,
    createTrainingCamp,
} from '@/app/db/queries/trainingCamps';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest) {
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

async function POSTHandler(req: AuditNextRequest) {
    try {
        const adminCtx = await requireAuth(req);
        const dto = trainingCampCreateSchema.parse(await req.json());
        const row = await createTrainingCamp({
            name: dto.name.trim(),
            semester: dto.semester,
            maxTotalMarks: dto.maxTotalMarks,
        });

        await req.audit.log({
            action: AuditEventType.TRAINING_CAMP_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.TRAINING_CAMP, id: row.id },
            metadata: {
                description: `Created training camp ${row.name}`,
                trainingCampId: row.id,
                semester: row.semester,
                maxTotalMarks: row.maxTotalMarks,
            },
        });
        return json.created({ message: 'Training camp created successfully.', trainingCamp: row });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', GETHandler);

export const POST = withAuditRoute('POST', POSTHandler);
