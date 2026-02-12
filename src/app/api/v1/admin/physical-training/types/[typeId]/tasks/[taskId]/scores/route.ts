import { json, handleApiError, ApiError } from '@/app/lib/http';

export const runtime = 'nodejs';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { requireAuth } from '@/app/lib/authz';
import { ptTaskScoreCreateSchema, ptTaskParam } from '@/app/lib/physical-training-validators';
import { getPtTask, listPtTaskScores, createPtTaskScore, getPtAttempt, getPtAttemptGrade } from '@/app/db/queries/physicalTraining';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ typeId: string; taskId: string }> },
) {
    try {
        await requireAuth(req);
        const { typeId, taskId } = ptTaskParam.parse(await params);
        const task = await getPtTask(taskId);
        if (!task || task.ptTypeId !== typeId) throw new ApiError(404, 'PT task not found', 'not_found');

        const items = await listPtTaskScores(taskId);
        return json.ok({ message: 'PT task scores retrieved successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ typeId: string; taskId: string }> },
) {
    try {
        const adminCtx = await requireAuth(req);
        const { typeId, taskId } = ptTaskParam.parse(await params);
        const task = await getPtTask(taskId);
        if (!task || task.ptTypeId !== typeId) throw new ApiError(404, 'PT task not found', 'not_found');

        const dto = ptTaskScoreCreateSchema.parse(await req.json());
        const attempt = await getPtAttempt(dto.ptAttemptId);
        if (!attempt || attempt.ptTypeId !== typeId) {
            throw new ApiError(400, 'Attempt does not belong to PT type', 'invalid_attempt');
        }
        const grade = await getPtAttemptGrade(dto.ptAttemptGradeId);
        if (!grade || grade.ptAttemptId !== attempt.id) {
            throw new ApiError(400, 'Grade does not belong to PT attempt', 'invalid_grade');
        }

        const row = await createPtTaskScore(taskId, {
            ptAttemptId: dto.ptAttemptId,
            ptAttemptGradeId: dto.ptAttemptGradeId,
            maxMarks: dto.maxMarks,
        });

        await req.audit.log({
            action: AuditEventType.PT_TASK_SCORE_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PT_TASK_SCORE, id: row.id },
            metadata: {
                description: `Created PT task score for task ${task.title}`,
                ptTaskScoreId: row.id,
                ptTaskId: taskId,
                ptAttemptId: dto.ptAttemptId,
                ptAttemptGradeId: dto.ptAttemptGradeId,
            },
        });
        return json.created({ message: 'PT task score created successfully.', score: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));
export const POST = withAuditRoute('POST', withAuthz(POSTHandler));
