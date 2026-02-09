import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { ptTypeParam, ptTypeUpdateSchema } from '@/app/lib/physical-training-validators';
import { getPtType, updatePtType, deletePtType } from '@/app/db/queries/physicalTraining';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ typeId: string }> }) {
    try {
        await requireAuth(req);
        const { typeId } = ptTypeParam.parse(await params);
        const row = await getPtType(typeId);
        if (!row) throw new ApiError(404, 'PT type not found', 'not_found');
        return json.ok({ message: 'PT type retrieved successfully.', ptType: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ typeId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { typeId } = ptTypeParam.parse(await params);
        const dto = ptTypeUpdateSchema.parse(await req.json());
        const row = await updatePtType(typeId, {
            ...dto,
            ...(dto.code ? { code: dto.code.trim() } : {}),
            ...(dto.title ? { title: dto.title.trim() } : {}),
            ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
        });
        if (!row) throw new ApiError(404, 'PT type not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.PT_TYPE_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PT_TYPE, id: row.id },
            metadata: {
                description: `Updated PT type ${row.code} (semester ${row.semester})`,
                ptTypeId: row.id,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'PT type updated successfully.', ptType: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ typeId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { typeId } = ptTypeParam.parse(await params);
        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deletePtType(typeId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'PT type not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.PT_TYPE_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PT_TYPE, id: row.id },
            metadata: {
                description: `${body?.hard ? 'Hard' : 'Soft'} deleted PT type ${row.code}`,
                ptTypeId: row.id,
                hardDeleted: body?.hard === true,
            },
        });
        return json.ok({ message: 'PT type deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const PATCH = withAuditRoute('PATCH', PATCHHandler);
export const DELETE = withAuditRoute('DELETE', DELETEHandler);
