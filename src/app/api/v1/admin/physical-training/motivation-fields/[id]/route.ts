import { json, handleApiError, ApiError } from '@/app/lib/http';

export const runtime = 'nodejs';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { requireAuth } from '@/app/lib/authz';
import { ptMotivationFieldParam, ptMotivationFieldUpdateSchema } from '@/app/lib/physical-training-validators';
import { getPtMotivationField, updatePtMotivationField, deletePtMotivationField } from '@/app/db/queries/physicalTraining';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAuth(req);
        const { id } = ptMotivationFieldParam.parse(await params);
        const row = await getPtMotivationField(id);
        if (!row) throw new ApiError(404, 'PT motivation field not found', 'not_found');
        return json.ok({ message: 'PT motivation field retrieved successfully.', field: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { id } = ptMotivationFieldParam.parse(await params);
        const dto = ptMotivationFieldUpdateSchema.parse(await req.json());
        const row = await updatePtMotivationField(id, {
            ...dto,
            ...(dto.label ? { label: dto.label.trim() } : {}),
        });
        if (!row) throw new ApiError(404, 'PT motivation field not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.PT_MOTIVATION_FIELD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PT_MOTIVATION_FIELD, id: row.id },
            metadata: {
                description: `Updated PT motivation field ${row.label}`,
                ptMotivationFieldId: row.id,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'PT motivation field updated successfully.', field: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { id } = ptMotivationFieldParam.parse(await params);
        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deletePtMotivationField(id, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'PT motivation field not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.PT_MOTIVATION_FIELD_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PT_MOTIVATION_FIELD, id: row.id },
            metadata: {
                description: `${body?.hard ? 'Hard' : 'Soft'} deleted PT motivation field ${row.label}`,
                ptMotivationFieldId: row.id,
                hardDeleted: body?.hard === true,
            },
        });
        return json.ok({ message: 'PT motivation field deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));
export const PATCH = withAuditRoute('PATCH', withAuthz(PATCHHandler));
export const DELETE = withAuditRoute('DELETE', withAuthz(DELETEHandler));
