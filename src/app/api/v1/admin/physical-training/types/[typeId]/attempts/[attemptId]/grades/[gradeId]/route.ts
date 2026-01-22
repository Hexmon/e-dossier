import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { ptAttemptGradeParam, ptAttemptGradeUpdateSchema } from '@/app/lib/physical-training-validators';
import { getPtAttempt, getPtAttemptGrade, updatePtAttemptGrade, deletePtAttemptGrade } from '@/app/db/queries/physicalTraining';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(
    req: NextRequest,
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
    req: NextRequest,
    { params }: { params: Promise<{ typeId: string; attemptId: string; gradeId: string }> },
) {
    try {
        const adminCtx = await requireAdmin(req);
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

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.PT_GRADE_UPDATED,
            resourceType: AuditResourceType.PT_GRADE,
            resourceId: row.id,
            description: `Updated PT grade ${row.code}`,
            metadata: {
                ptGradeId: row.id,
                ptAttemptId: row.ptAttemptId,
                changes: Object.keys(dto),
            },
            request: req,
            required: true,
        });
        return json.ok({ message: 'PT grade updated successfully.', grade: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(
    req: NextRequest,
    { params }: { params: Promise<{ typeId: string; attemptId: string; gradeId: string }> },
) {
    try {
        const adminCtx = await requireAdmin(req);
        const { typeId, attemptId, gradeId } = ptAttemptGradeParam.parse(await params);
        const attempt = await getPtAttempt(attemptId);
        if (!attempt || attempt.ptTypeId !== typeId) throw new ApiError(404, 'PT attempt not found', 'not_found');
        const existing = await getPtAttemptGrade(gradeId);
        if (!existing || existing.ptAttemptId !== attemptId) throw new ApiError(404, 'PT grade not found', 'not_found');

        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deletePtAttemptGrade(gradeId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'PT grade not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.PT_GRADE_DELETED,
            resourceType: AuditResourceType.PT_GRADE,
            resourceId: row.id,
            description: `${body?.hard ? 'Hard' : 'Soft'} deleted PT grade ${row.code}`,
            metadata: {
                ptGradeId: row.id,
                ptAttemptId: row.ptAttemptId,
                hardDeleted: body?.hard === true,
            },
            request: req,
        });
        return json.ok({ message: 'PT grade deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const PATCH = withRouteLogging('PATCH', PATCHHandler);
export const DELETE = withRouteLogging('DELETE', DELETEHandler);
