import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { ptAttemptGradeCreateSchema, ptAttemptGradeQuerySchema, ptAttemptParam } from '@/app/lib/physical-training-validators';
import { getPtAttempt, listPtAttemptGrades, createPtAttemptGrade } from '@/app/db/queries/physicalTraining';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ typeId: string; attemptId: string }> }) {
    try {
        await requireAuth(req);
        const { typeId, attemptId } = ptAttemptParam.parse(await params);
        const attempt = await getPtAttempt(attemptId);
        if (!attempt || attempt.ptTypeId !== typeId) throw new ApiError(404, 'PT attempt not found', 'not_found');

        const sp = new URL(req.url).searchParams;
        const qp = ptAttemptGradeQuerySchema.parse({
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });
        const items = await listPtAttemptGrades(attemptId, { includeDeleted: qp.includeDeleted ?? false });
        return json.ok({ message: 'PT grades retrieved successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ typeId: string; attemptId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { typeId, attemptId } = ptAttemptParam.parse(await params);
        const attempt = await getPtAttempt(attemptId);
        if (!attempt || attempt.ptTypeId !== typeId) throw new ApiError(404, 'PT attempt not found', 'not_found');

        const dto = ptAttemptGradeCreateSchema.parse(await req.json());
        const row = await createPtAttemptGrade(attemptId, {
            code: dto.code.trim(),
            label: dto.label.trim(),
            sortOrder: dto.sortOrder ?? 0,
            isActive: dto.isActive ?? true,
        });

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.PT_GRADE_CREATED,
            resourceType: AuditResourceType.PT_GRADE,
            resourceId: row.id,
            description: `Created PT grade ${row.code} for attempt ${attempt.code}`,
            metadata: {
                ptGradeId: row.id,
                ptAttemptId: attemptId,
                ptTypeId: typeId,
            },
            request: req,
            required: true,
        });
        return json.created({ message: 'PT grade created successfully.', grade: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const POST = withRouteLogging('POST', POSTHandler);
