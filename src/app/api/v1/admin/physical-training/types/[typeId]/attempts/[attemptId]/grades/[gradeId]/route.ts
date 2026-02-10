import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { ptAttemptGradeParam, ptAttemptGradeUpdateSchema } from '@/app/lib/physical-training-validators';
import { getPtAttempt, getPtAttemptGrade, updatePtAttemptGrade, deletePtAttemptGrade } from '@/app/db/queries/physicalTraining';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ typeId: string; attemptId: string; gradeId: string }> },
) {
    try {
        await requireAuth(req);
        const { typeId, attemptId, gradeId } = ptAttemptGradeParam.parse(await params);
        const attempt = await getPtAttempt(attemptId);
        if (!attempt || attempt.ptTypeId !== typeId) throw new ApiError(404, 'PT attempt not found', 'not_found');
        const row = await getPtAttemptGrade(gradeId);
        if (!row || row.ptAttemptId !== attemptId) throw new ApiError(404, 'PT grade not found', 'not_found');
        return json.ok({ message: 'PT grade retrieved successfully.', grade: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ typeId: string; attemptId: string; gradeId: string }> },
) {
    try {
        const adminCtx = await requireAuth(req);
        const { typeId, attemptId, gradeId } = ptAttemptGradeParam.parse(await params);
        const attempt = await getPtAttempt(attemptId);
        if (!attempt || attempt.ptTypeId !== typeId) throw new ApiError(404, 'PT attempt not found', 'not_found');
        const existing = await getPtAttemptGrade(gradeId);
        if (!existing || existing.ptAttemptId !== attemptId) throw new ApiError(404, 'PT grade not found', 'not_found');

        const dto = ptAttemptGradeUpdateSchema.parse(await req.json());
        const row = await updatePtAttemptGrade(gradeId, {
            ...dto,
            ...(dto.code ? { code: dto.code.trim() } : {}),
            ...(dto.label ? { label: dto.label.trim() } : {}),
        });
        if (!row) throw new ApiError(404, 'PT grade not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.PT_GRADE_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PT_GRADE, id: row.id },
            metadata: {
                description: `Updated PT grade ${row.code}`,
                ptGradeId: row.id,
                ptAttemptId: row.ptAttemptId,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'PT grade updated successfully.', grade: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ typeId: string; attemptId: string; gradeId: string }> },
) {
    try {
        const adminCtx = await requireAuth(req);
        const { typeId, attemptId, gradeId } = ptAttemptGradeParam.parse(await params);
        const attempt = await getPtAttempt(attemptId);
        if (!attempt || attempt.ptTypeId !== typeId) throw new ApiError(404, 'PT attempt not found', 'not_found');
        const existing = await getPtAttemptGrade(gradeId);
        if (!existing || existing.ptAttemptId !== attemptId) throw new ApiError(404, 'PT grade not found', 'not_found');

        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deletePtAttemptGrade(gradeId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'PT grade not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.PT_GRADE_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PT_GRADE, id: row.id },
            metadata: {
                description: `${body?.hard ? 'Hard' : 'Soft'} deleted PT grade ${row.code}`,
                ptGradeId: row.id,
                ptAttemptId: row.ptAttemptId,
                hardDeleted: body?.hard === true,
            },
        });
        return json.ok({ message: 'PT grade deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const PATCH = withAuditRoute('PATCH', PATCHHandler);
export const DELETE = withAuditRoute('DELETE', DELETEHandler);
