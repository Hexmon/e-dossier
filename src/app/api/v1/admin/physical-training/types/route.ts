import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { ptTypeCreateSchema, ptTypeQuerySchema } from '@/app/lib/physical-training-validators';
import { listPtTypes, createPtType } from '@/app/db/queries/physicalTraining';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest) {
    try {
        await requireAuth(req);
        const sp = new URL(req.url).searchParams;
        const qp = ptTypeQuerySchema.parse({
            semester: sp.get('semester') ?? undefined,
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });
        const items = await listPtTypes({
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
        const row = await createPtType({
            semester: dto.semester,
            code: dto.code.trim(),
            title: dto.title.trim(),
            description: dto.description ?? null,
            maxTotalMarks: dto.maxTotalMarks,
            sortOrder: dto.sortOrder ?? 0,
            isActive: dto.isActive ?? true,
        });

        await req.audit.log({
            action: AuditEventType.PT_TYPE_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PT_TYPE, id: row.id },
            metadata: {
                description: `Created PT type ${row.code} (semester ${row.semester})`,
                ptTypeId: row.id,
                semester: row.semester,
                code: row.code,
            },
        });
        return json.created({ message: 'PT type created successfully.', ptType: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const POST = withAuditRoute('POST', POSTHandler);
