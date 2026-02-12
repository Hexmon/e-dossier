import { json, handleApiError, ApiError } from '@/app/lib/http';

export const runtime = 'nodejs';
import { withAuthz } from '@/app/lib/acx/withAuthz';
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
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(
    req: AuditNextRequest,
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
    req: AuditNextRequest,
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

        await req.audit.log({
            action: AuditEventType.PT_TASK_SCORE_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PT_TASK_SCORE, id: row.id },
            metadata: {
                description: `Updated PT task score ${row.id}`,
                ptTaskScoreId: row.id,
                ptTaskId: taskId,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'PT task score updated successfully.', score: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(
    req: AuditNextRequest,
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

        await req.audit.log({
            action: AuditEventType.PT_TASK_SCORE_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PT_TASK_SCORE, id: row.id },
            metadata: {
                description: `Deleted PT task score ${row.id}`,
                ptTaskScoreId: row.id,
                ptTaskId: taskId,
            },
        });
        return json.ok({ message: 'PT task score deleted successfully.', deleted: row.id });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));
export const PATCH = withAuditRoute('PATCH', withAuthz(PATCHHandler));
export const DELETE = withAuditRoute('DELETE', withAuthz(DELETEHandler));
