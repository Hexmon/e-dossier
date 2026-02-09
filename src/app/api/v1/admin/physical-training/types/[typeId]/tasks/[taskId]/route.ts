import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { ptTaskParam, ptTaskUpdateSchema } from '@/app/lib/physical-training-validators';
import { getPtTask, updatePtTask, deletePtTask } from '@/app/db/queries/physicalTraining';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ typeId: string; taskId: string }> }) {
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

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ typeId: string; taskId: string }> }) {
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

        await req.audit.log({
            action: AuditEventType.PT_TASK_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PT_TASK, id: row.id },
            metadata: {
                description: `Updated PT task ${row.title}`,
                ptTaskId: row.id,
                ptTypeId: row.ptTypeId,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'PT task updated successfully.', task: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ typeId: string; taskId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { typeId, taskId } = ptTaskParam.parse(await params);
        const existing = await getPtTask(taskId);
        if (!existing || existing.ptTypeId !== typeId) throw new ApiError(404, 'PT task not found', 'not_found');

        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deletePtTask(taskId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'PT task not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.PT_TASK_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PT_TASK, id: row.id },
            metadata: {
                description: `${body?.hard ? 'Hard' : 'Soft'} deleted PT task ${row.title}`,
                ptTaskId: row.id,
                ptTypeId: row.ptTypeId,
                hardDeleted: body?.hard === true,
            },
        });
        return json.ok({ message: 'PT task deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const PATCH = withAuditRoute('PATCH', PATCHHandler);
export const DELETE = withAuditRoute('DELETE', DELETEHandler);
