import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { ptTaskParam, ptTaskUpdateSchema } from '@/app/lib/physical-training-validators';
import { getPtTask, updatePtTask, deletePtTask } from '@/app/db/queries/physicalTraining';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ typeId: string; taskId: string }> }) {
    try {
        await requireAuth(req);
        const { typeId, taskId } = ptTaskParam.parse(await params);
        const row = await getPtTask(taskId);
        if (!row || row.ptTypeId !== typeId) throw new ApiError(404, 'PT task not found', 'not_found');
        return json.ok({ message: 'PT task retrieved successfully.', task: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ typeId: string; taskId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { typeId, taskId } = ptTaskParam.parse(await params);
        const existing = await getPtTask(taskId);
        if (!existing || existing.ptTypeId !== typeId) throw new ApiError(404, 'PT task not found', 'not_found');

        const dto = ptTaskUpdateSchema.parse(await req.json());
        const row = await updatePtTask(taskId, {
            ...dto,
            ...(dto.title ? { title: dto.title.trim() } : {}),
        });
        if (!row) throw new ApiError(404, 'PT task not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.PT_TASK_UPDATED,
            resourceType: AuditResourceType.PT_TASK,
            resourceId: row.id,
            description: `Updated PT task ${row.title}`,
            metadata: {
                ptTaskId: row.id,
                ptTypeId: row.ptTypeId,
                changes: Object.keys(dto),
            },
            request: req,
            required: true,
        });
        return json.ok({ message: 'PT task updated successfully.', task: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ typeId: string; taskId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { typeId, taskId } = ptTaskParam.parse(await params);
        const existing = await getPtTask(taskId);
        if (!existing || existing.ptTypeId !== typeId) throw new ApiError(404, 'PT task not found', 'not_found');

        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deletePtTask(taskId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'PT task not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.PT_TASK_DELETED,
            resourceType: AuditResourceType.PT_TASK,
            resourceId: row.id,
            description: `${body?.hard ? 'Hard' : 'Soft'} deleted PT task ${row.title}`,
            metadata: {
                ptTaskId: row.id,
                ptTypeId: row.ptTypeId,
                hardDeleted: body?.hard === true,
            },
            request: req,
        });
        return json.ok({ message: 'PT task deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const PATCH = withRouteLogging('PATCH', PATCHHandler);
export const DELETE = withRouteLogging('DELETE', DELETEHandler);
