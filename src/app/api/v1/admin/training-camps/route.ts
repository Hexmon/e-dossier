import { json, handleApiError, ApiError } from '@/app/lib/http';

export const runtime = 'nodejs';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { requireAuth } from '@/app/lib/authz';
import {
    trainingCampCreateSchema,
    trainingCampQuerySchema,
} from '@/app/lib/training-camp-validators';
import {
    listTrainingCamps,
    createTrainingCamp,
    countActiveTrainingCampsBySemester,
    getTrainingCampSettings,
} from '@/app/db/queries/trainingCamps';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest) {
    try {
        await requireAuth(req);
        const sp = new URL(req.url).searchParams;
        const qp = trainingCampQuerySchema.parse({
            courseId: sp.get('courseId') ?? undefined,
            semester: sp.get('semester') ?? undefined,
            includeActivities: sp.get('includeActivities') ?? undefined,
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });

        const items = await listTrainingCamps({
            courseId: qp.courseId,
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
        const settings = await getTrainingCampSettings();
        const activeCount = await countActiveTrainingCampsBySemester(dto.courseId, dto.semester);
        if (activeCount >= settings.maxCampsPerSemester) {
            throw new ApiError(
                400,
                `Maximum ${settings.maxCampsPerSemester} camps allowed for semester ${dto.semester}.`,
                'MAX_CAMPS_PER_SEMESTER_EXCEEDED',
            );
        }
        const row = await createTrainingCamp({
            courseId: dto.courseId,
            name: dto.name.trim(),
            semester: dto.semester,
            sortOrder: dto.sortOrder ?? activeCount + 1,
            maxTotalMarks: dto.maxTotalMarks,
            performanceTitle: dto.performanceTitle ?? null,
            performanceGuidance: dto.performanceGuidance ?? null,
            signaturePrimaryLabel: dto.signaturePrimaryLabel ?? null,
            signatureSecondaryLabel: dto.signatureSecondaryLabel ?? null,
            noteLine1: dto.noteLine1 ?? null,
            noteLine2: dto.noteLine2 ?? null,
            showAggregateSummary: dto.showAggregateSummary ?? false,
        });

        await req.audit.log({
            action: AuditEventType.TRAINING_CAMP_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.TRAINING_CAMP, id: row.id },
            metadata: {
                description: `Created training camp ${row.name}`,
                trainingCampId: row.id,
                courseId: row.courseId,
                semester: row.semester,
                maxTotalMarks: row.maxTotalMarks,
            },
        });
        return json.created({ message: 'Training camp created successfully.', trainingCamp: row });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', withAuthz(GETHandler));

export const POST = withAuditRoute('POST', withAuthz(POSTHandler));