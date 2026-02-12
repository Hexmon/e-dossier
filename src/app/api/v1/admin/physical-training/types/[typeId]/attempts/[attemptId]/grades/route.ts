import { json, handleApiError, ApiError } from '@/app/lib/http';

export const runtime = 'nodejs';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { requireAuth } from '@/app/lib/authz';
import { ptAttemptGradeCreateSchema, ptAttemptGradeQuerySchema, ptAttemptParam } from '@/app/lib/physical-training-validators';
import { getPtAttempt, listPtAttemptGrades, createPtAttemptGrade } from '@/app/db/queries/physicalTraining';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ typeId: string; attemptId: string }> }) {
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

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ typeId: string; attemptId: string }> }) {
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

        await req.audit.log({
            action: AuditEventType.PT_GRADE_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PT_GRADE, id: row.id },
            metadata: {
                description: `Created PT grade ${row.code} for attempt ${attempt.code}`,
                ptGradeId: row.id,
                ptAttemptId: attemptId,
                ptTypeId: typeId,
            },
        });
        return json.created({ message: 'PT grade created successfully.', grade: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));
export const POST = withAuditRoute('POST', withAuthz(POSTHandler));
