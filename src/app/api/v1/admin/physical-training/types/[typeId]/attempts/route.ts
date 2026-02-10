import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { ptAttemptCreateSchema, ptAttemptQuerySchema, ptTypeParam } from '@/app/lib/physical-training-validators';
import { getPtType, listPtAttempts, createPtAttempt } from '@/app/db/queries/physicalTraining';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ typeId: string }> }) {
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

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ typeId: string }> }) {
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

        await req.audit.log({
            action: AuditEventType.PT_ATTEMPT_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PT_ATTEMPT, id: row.id },
            metadata: {
                description: `Created PT attempt ${row.code} for type ${type.code}`,
                ptAttemptId: row.id,
                ptTypeId: typeId,
            },
        });
        return json.created({ message: 'PT attempt created successfully.', attempt: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const POST = withAuditRoute('POST', POSTHandler);
