import { json, handleApiError, ApiError } from '@/app/lib/http';

export const runtime = 'nodejs';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { requireAuth } from '@/app/lib/authz';
import { ptMotivationFieldCreateSchema, ptMotivationFieldQuerySchema } from '@/app/lib/physical-training-validators';
import { listPtMotivationFields, createPtMotivationField, findPtMotivationFieldBySemesterAndSortOrder, getNextPtMotivationFieldSortOrder } from '@/app/db/queries/physicalTraining';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest) {
    try {
        await requireAuth(req);
        const sp = new URL(req.url).searchParams;
        const qp = ptMotivationFieldQuerySchema.parse({
            courseId: sp.get('courseId') ?? undefined,
            semester: sp.get('semester') ?? undefined,
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });
        const items = await listPtMotivationFields({
            courseId: qp.courseId,
            semester: qp.semester,
            includeDeleted: qp.includeDeleted ?? false,
        });
        return json.ok({ message: 'PT motivation fields retrieved successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: AuditNextRequest) {
    try {
        const adminCtx = await requireAuth(req);
        const dto = ptMotivationFieldCreateSchema.parse(await req.json());
        const targetSortOrder = dto.sortOrder ?? (await getNextPtMotivationFieldSortOrder(dto.courseId, dto.semester));
        const duplicate = await findPtMotivationFieldBySemesterAndSortOrder(dto.courseId, dto.semester, targetSortOrder);
        if (duplicate) {
            throw new ApiError(
                409,
                `Sort order ${targetSortOrder} already exists for semester ${dto.semester}`,
                'sort_order_conflict',
                {
                    field: 'sortOrder',
                    sortOrder: targetSortOrder,
                    semester: dto.semester,
                    conflictingFieldId: duplicate.id,
                },
            );
        }

        const row = await createPtMotivationField({
            courseId: dto.courseId,
            semester: dto.semester,
            label: dto.label.trim(),
            sortOrder: targetSortOrder,
            isActive: dto.isActive ?? true,
        });

        await req.audit.log({
            action: AuditEventType.PT_MOTIVATION_FIELD_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PT_MOTIVATION_FIELD, id: row.id },
            metadata: {
                description: `Created PT motivation field ${row.label} (course ${row.courseId}, semester ${row.semester})`,
                ptMotivationFieldId: row.id,
                courseId: row.courseId,
                semester: row.semester,
            },
        });
        return json.created({ message: 'PT motivation field created successfully.', field: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));
export const POST = withAuditRoute('POST', withAuthz(POSTHandler));
