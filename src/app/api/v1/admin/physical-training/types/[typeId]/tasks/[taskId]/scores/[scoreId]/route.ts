import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { ptTaskScoreParam, ptTaskScoreUpdateSchema } from '@/app/lib/physical-training-validators';
import {
    getPtTask,
    getPtTaskScore,
    updatePtTaskScore,
    deletePtTaskScore,
    getPtAttempt,
    getPtAttemptGrade,
} from '@/app/db/queries/physicalTraining';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(
    req: NextRequest,
    { params }: { params: Promise<{ typeId: string; taskId: string; scoreId: string }> },
) {
    try {
        await requireAuth(req);
        const { typeId, taskId, scoreId } = ptTaskScoreParam.parse(await params);
        const task = await getPtTask(taskId);
        if (!task || task.ptTypeId !== typeId) throw new ApiError(404, 'PT task not found', 'not_found');
        const row = await getPtTaskScore(scoreId);
        if (!row || row.ptTaskId !== taskId) throw new ApiError(404, 'PT task score not found', 'not_found');
        return json.ok({ message: 'PT task score retrieved successfully.', score: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(
    req: NextRequest,
    { params }: { params: Promise<{ typeId: string; taskId: string; scoreId: string }> },
) {
    try {
        const adminCtx = await requireAuth(req);
        const { typeId, taskId, scoreId } = ptTaskScoreParam.parse(await params);
        const task = await getPtTask(taskId);
        if (!task || task.ptTypeId !== typeId) throw new ApiError(404, 'PT task not found', 'not_found');
        const existing = await getPtTaskScore(scoreId);
        if (!existing || existing.ptTaskId !== taskId) throw new ApiError(404, 'PT task score not found', 'not_found');

        const dto = ptTaskScoreUpdateSchema.parse(await req.json());
        const attemptId = dto.ptAttemptId ?? existing.ptAttemptId;
        const gradeId = dto.ptAttemptGradeId ?? existing.ptAttemptGradeId;

        const attempt = await getPtAttempt(attemptId);
        if (!attempt || attempt.ptTypeId !== typeId) {
            throw new ApiError(400, 'Attempt does not belong to PT type', 'invalid_attempt');
        }
        const grade = await getPtAttemptGrade(gradeId);
        if (!grade || grade.ptAttemptId !== attempt.id) {
            throw new ApiError(400, 'Grade does not belong to PT attempt', 'invalid_grade');
        }

        const row = await updatePtTaskScore(scoreId, {
            ...dto,
            ptAttemptId: attemptId,
            ptAttemptGradeId: gradeId,
        });
        if (!row) throw new ApiError(404, 'PT task score not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.PT_TASK_SCORE_UPDATED,
            resourceType: AuditResourceType.PT_TASK_SCORE,
            resourceId: row.id,
            description: `Updated PT task score ${row.id}`,
            metadata: {
                ptTaskScoreId: row.id,
                ptTaskId: taskId,
                changes: Object.keys(dto),
            },
            request: req,
            required: true,
        });
        return json.ok({ message: 'PT task score updated successfully.', score: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(
    req: NextRequest,
    { params }: { params: Promise<{ typeId: string; taskId: string; scoreId: string }> },
) {
    try {
        const adminCtx = await requireAuth(req);
        const { typeId, taskId, scoreId } = ptTaskScoreParam.parse(await params);
        const task = await getPtTask(taskId);
        if (!task || task.ptTypeId !== typeId) throw new ApiError(404, 'PT task not found', 'not_found');
        const existing = await getPtTaskScore(scoreId);
        if (!existing || existing.ptTaskId !== taskId) throw new ApiError(404, 'PT task score not found', 'not_found');

        const row = await deletePtTaskScore(scoreId);
        if (!row) throw new ApiError(404, 'PT task score not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.PT_TASK_SCORE_DELETED,
            resourceType: AuditResourceType.PT_TASK_SCORE,
            resourceId: row.id,
            description: `Deleted PT task score ${row.id}`,
            metadata: {
                ptTaskScoreId: row.id,
                ptTaskId: taskId,
            },
            request: req,
        });
        return json.ok({ message: 'PT task score deleted successfully.', deleted: row.id });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const PATCH = withRouteLogging('PATCH', PATCHHandler);
export const DELETE = withRouteLogging('DELETE', DELETEHandler);
