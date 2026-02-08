import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { ptAttemptParam, ptAttemptUpdateSchema } from '@/app/lib/physical-training-validators';
import { getPtAttempt, updatePtAttempt, deletePtAttempt } from '@/app/db/queries/physicalTraining';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ typeId: string; attemptId: string }> }) {
    try {
        await requireAuth(req);
        const { typeId, attemptId } = ptAttemptParam.parse(await params);
        const row = await getPtAttempt(attemptId);
        if (!row || row.ptTypeId !== typeId) throw new ApiError(404, 'PT attempt not found', 'not_found');
        return json.ok({ message: 'PT attempt retrieved successfully.', attempt: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ typeId: string; attemptId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { typeId, attemptId } = ptAttemptParam.parse(await params);
        const existing = await getPtAttempt(attemptId);
        if (!existing || existing.ptTypeId !== typeId) throw new ApiError(404, 'PT attempt not found', 'not_found');

        const dto = ptAttemptUpdateSchema.parse(await req.json());
        const row = await updatePtAttempt(attemptId, {
            ...dto,
            ...(dto.code ? { code: dto.code.trim() } : {}),
            ...(dto.label ? { label: dto.label.trim() } : {}),
        });
        if (!row) throw new ApiError(404, 'PT attempt not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.PT_ATTEMPT_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PT_ATTEMPT, id: row.id },
            metadata: {
                description: `Updated PT attempt ${row.code}`,
                ptAttemptId: row.id,
                ptTypeId: row.ptTypeId,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'PT attempt updated successfully.', attempt: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ typeId: string; attemptId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { typeId, attemptId } = ptAttemptParam.parse(await params);
        const existing = await getPtAttempt(attemptId);
        if (!existing || existing.ptTypeId !== typeId) throw new ApiError(404, 'PT attempt not found', 'not_found');

        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deletePtAttempt(attemptId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'PT attempt not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.PT_ATTEMPT_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PT_ATTEMPT, id: row.id },
            metadata: {
                description: `${body?.hard ? 'Hard' : 'Soft'} deleted PT attempt ${row.code}`,
                ptAttemptId: row.id,
                ptTypeId: row.ptTypeId,
                hardDeleted: body?.hard === true,
            },
        });
        return json.ok({ message: 'PT attempt deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const PATCH = withAuditRoute('PATCH', PATCHHandler);
export const DELETE = withAuditRoute('DELETE', DELETEHandler);
