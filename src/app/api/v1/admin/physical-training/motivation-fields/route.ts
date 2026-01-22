import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { ptMotivationFieldCreateSchema, ptMotivationFieldQuerySchema } from '@/app/lib/physical-training-validators';
import { listPtMotivationFields, createPtMotivationField } from '@/app/db/queries/physicalTraining';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest) {
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

async function POSTHandler(req: NextRequest) {
    try {
        const adminCtx = await requireAdmin(req);
        const dto = ptMotivationFieldCreateSchema.parse(await req.json());
        const row = await createPtMotivationField({
            semester: dto.semester,
            label: dto.label.trim(),
            sortOrder: dto.sortOrder ?? 0,
            isActive: dto.isActive ?? true,
        });

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.PT_MOTIVATION_FIELD_CREATED,
            resourceType: AuditResourceType.PT_MOTIVATION_FIELD,
            resourceId: row.id,
            description: `Created PT motivation field ${row.label} (semester ${row.semester})`,
            metadata: {
                ptMotivationFieldId: row.id,
                semester: row.semester,
            },
            request: req,
            required: true,
        });
        return json.created({ message: 'PT motivation field created successfully.', field: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const POST = withRouteLogging('POST', POSTHandler);
