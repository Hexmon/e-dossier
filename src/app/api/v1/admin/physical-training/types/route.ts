import { json, handleApiError, ApiError } from '@/app/lib/http';

export const runtime = 'nodejs';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { requireAuth } from '@/app/lib/authz';
import { ptTypeCreateSchema, ptTypeQuerySchema } from '@/app/lib/physical-training-validators';
import { listPtTypes, createPtType, findPtTypeBySemesterAndSortOrder, getNextPtTypeSortOrder } from '@/app/db/queries/physicalTraining';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest) {
    try {
        await requireAuth(req);
        const sp = new URL(req.url).searchParams;
        const qp = ptTypeQuerySchema.parse({
            courseId: sp.get('courseId') ?? undefined,
            semester: sp.get('semester') ?? undefined,
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });
        const items = await listPtTypes({
            courseId: qp.courseId,
            semester: qp.semester,
            includeDeleted: qp.includeDeleted ?? false,
        });
        return json.ok({ message: 'PT types retrieved successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: AuditNextRequest) {
    try {
        const adminCtx = await requireAuth(req);
        const dto = ptTypeCreateSchema.parse(await req.json());
        const targetSortOrder = dto.sortOrder ?? (await getNextPtTypeSortOrder(dto.courseId, dto.semester));
        const duplicate = await findPtTypeBySemesterAndSortOrder(dto.courseId, dto.semester, targetSortOrder);
        if (duplicate) {
            throw new ApiError(
                409,
                `Sort order ${targetSortOrder} already exists for semester ${dto.semester}`,
                'sort_order_conflict',
                {
                    field: 'sortOrder',
                    sortOrder: targetSortOrder,
                    semester: dto.semester,
                    conflictingTypeId: duplicate.id,
                },
            );
        }

        const row = await createPtType({
            courseId: dto.courseId,
            semester: dto.semester,
            code: dto.code.trim(),
            title: dto.title.trim(),
            description: dto.description ?? null,
            maxTotalMarks: dto.maxTotalMarks,
            sortOrder: targetSortOrder,
            isActive: dto.isActive ?? true,
        });

        await req.audit.log({
            action: AuditEventType.PT_TYPE_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PT_TYPE, id: row.id },
            metadata: {
                description: `Created PT type ${row.code} (course ${row.courseId}, semester ${row.semester})`,
                ptTypeId: row.id,
                courseId: row.courseId,
                semester: row.semester,
                code: row.code,
            },
        });
        return json.created({ message: 'PT type created successfully.', ptType: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));
export const POST = withAuditRoute('POST', withAuthz(POSTHandler));
