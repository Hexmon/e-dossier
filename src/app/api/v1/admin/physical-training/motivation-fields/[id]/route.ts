import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { ptMotivationFieldParam, ptMotivationFieldUpdateSchema } from '@/app/lib/physical-training-validators';
import { getPtMotivationField, updatePtMotivationField, deletePtMotivationField } from '@/app/db/queries/physicalTraining';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAuth(req);
        const { id } = ptMotivationFieldParam.parse(await params);
        const row = await getPtMotivationField(id);
        if (!row) throw new ApiError(404, 'PT motivation field not found', 'not_found');
        return json.ok({ message: 'PT motivation field retrieved successfully.', field: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminCtx = await requireAdmin(req);
        const { id } = ptMotivationFieldParam.parse(await params);
        const dto = ptMotivationFieldUpdateSchema.parse(await req.json());
        const row = await updatePtMotivationField(id, {
            ...dto,
            ...(dto.label ? { label: dto.label.trim() } : {}),
        });
        if (!row) throw new ApiError(404, 'PT motivation field not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.PT_MOTIVATION_FIELD_UPDATED,
            resourceType: AuditResourceType.PT_MOTIVATION_FIELD,
            resourceId: row.id,
            description: `Updated PT motivation field ${row.label}`,
            metadata: {
                ptMotivationFieldId: row.id,
                changes: Object.keys(dto),
            },
            request: req,
            required: true,
        });
        return json.ok({ message: 'PT motivation field updated successfully.', field: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminCtx = await requireAdmin(req);
        const { id } = ptMotivationFieldParam.parse(await params);
        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deletePtMotivationField(id, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'PT motivation field not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.PT_MOTIVATION_FIELD_DELETED,
            resourceType: AuditResourceType.PT_MOTIVATION_FIELD,
            resourceId: row.id,
            description: `${body?.hard ? 'Hard' : 'Soft'} deleted PT motivation field ${row.label}`,
            metadata: {
                ptMotivationFieldId: row.id,
                hardDeleted: body?.hard === true,
            },
            request: req,
        });
        return json.ok({ message: 'PT motivation field deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const PATCH = withRouteLogging('PATCH', PATCHHandler);
export const DELETE = withRouteLogging('DELETE', DELETEHandler);
