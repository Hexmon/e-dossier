import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { ptTypeCreateSchema, ptTypeQuerySchema } from '@/app/lib/physical-training-validators';
import { listPtTypes, createPtType } from '@/app/db/queries/physicalTraining';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest) {
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

async function POSTHandler(req: NextRequest) {
    try {
        const adminCtx = await requireAdmin(req);
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

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.PT_TYPE_CREATED,
            resourceType: AuditResourceType.PT_TYPE,
            resourceId: row.id,
            description: `Created PT type ${row.code} (semester ${row.semester})`,
            metadata: {
                ptTypeId: row.id,
                semester: row.semester,
                code: row.code,
            },
            request: req,
            required: true,
        });
        return json.created({ message: 'PT type created successfully.', ptType: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const POST = withRouteLogging('POST', POSTHandler);
