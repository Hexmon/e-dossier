import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { ptAttemptCreateSchema, ptAttemptQuerySchema, ptTypeParam } from '@/app/lib/physical-training-validators';
import { getPtType, listPtAttempts, createPtAttempt } from '@/app/db/queries/physicalTraining';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ typeId: string }> }) {
    try {
        await requireAuth(req);
        const { typeId } = ptTypeParam.parse(await params);
        const type = await getPtType(typeId);
        if (!type) throw new ApiError(404, 'PT type not found', 'not_found');

        const sp = new URL(req.url).searchParams;
        const qp = ptAttemptQuerySchema.parse({
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });
        const items = await listPtAttempts(typeId, { includeDeleted: qp.includeDeleted ?? false });
        return json.ok({ message: 'PT attempts retrieved successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ typeId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { typeId } = ptTypeParam.parse(await params);
        const type = await getPtType(typeId);
        if (!type) throw new ApiError(404, 'PT type not found', 'not_found');

        const dto = ptAttemptCreateSchema.parse(await req.json());
        const row = await createPtAttempt(typeId, {
            code: dto.code.trim(),
            label: dto.label.trim(),
            isCompensatory: dto.isCompensatory ?? false,
            sortOrder: dto.sortOrder ?? 0,
            isActive: dto.isActive ?? true,
        });

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.PT_ATTEMPT_CREATED,
            resourceType: AuditResourceType.PT_ATTEMPT,
            resourceId: row.id,
            description: `Created PT attempt ${row.code} for type ${type.code}`,
            metadata: {
                ptAttemptId: row.id,
                ptTypeId: typeId,
            },
            request: req,
            required: true,
        });
        return json.created({ message: 'PT attempt created successfully.', attempt: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const POST = withRouteLogging('POST', POSTHandler);
