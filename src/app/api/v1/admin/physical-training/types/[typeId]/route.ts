import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { ptTypeParam, ptTypeUpdateSchema } from '@/app/lib/physical-training-validators';
import { getPtType, updatePtType, deletePtType } from '@/app/db/queries/physicalTraining';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ typeId: string }> }) {
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

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ typeId: string }> }) {
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

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.PT_TYPE_UPDATED,
            resourceType: AuditResourceType.PT_TYPE,
            resourceId: row.id,
            description: `Updated PT type ${row.code} (semester ${row.semester})`,
            metadata: {
                ptTypeId: row.id,
                changes: Object.keys(dto),
            },
            request: req,
            required: true,
        });
        return json.ok({ message: 'PT type updated successfully.', ptType: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ typeId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { typeId } = ptTypeParam.parse(await params);
        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deletePtType(typeId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'PT type not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.PT_TYPE_DELETED,
            resourceType: AuditResourceType.PT_TYPE,
            resourceId: row.id,
            description: `${body?.hard ? 'Hard' : 'Soft'} deleted PT type ${row.code}`,
            metadata: {
                ptTypeId: row.id,
                hardDeleted: body?.hard === true,
            },
            request: req,
        });
        return json.ok({ message: 'PT type deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const PATCH = withRouteLogging('PATCH', PATCHHandler);
export const DELETE = withRouteLogging('DELETE', DELETEHandler);
