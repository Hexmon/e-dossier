import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { ptMotivationFieldCreateSchema, ptMotivationFieldQuerySchema } from '@/app/lib/physical-training-validators';
import { listPtMotivationFields, createPtMotivationField } from '@/app/db/queries/physicalTraining';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest) {
    try {
        await requireAuth(req);
        const sp = new URL(req.url).searchParams;
        const qp = ptMotivationFieldQuerySchema.parse({
            semester: sp.get('semester') ?? undefined,
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });
        const items = await listPtMotivationFields({
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
        const row = await createPtMotivationField({
            semester: dto.semester,
            label: dto.label.trim(),
            sortOrder: dto.sortOrder ?? 0,
            isActive: dto.isActive ?? true,
        });

        await req.audit.log({
            action: AuditEventType.PT_MOTIVATION_FIELD_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PT_MOTIVATION_FIELD, id: row.id },
            metadata: {
                description: `Created PT motivation field ${row.label} (semester ${row.semester})`,
                ptMotivationFieldId: row.id,
                semester: row.semester,
            },
        });
        return json.created({ message: 'PT motivation field created successfully.', field: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const POST = withAuditRoute('POST', POSTHandler);
