import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, medicalUpdateSchema } from '@/app/lib/oc-validators';
import { getMedical, updateMedical, deleteMedical } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const row = await getMedical(ocId, id); if (!row) throw new ApiError(404, 'Medical record not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Medical record ${row.id} retrieved successfully.`,
                ocId,
                module: 'medical',
                recordId: row.id,
            },
        });

        return json.ok({ message: 'Medical record retrieved successfully.', data: row });
    } catch (err) { return handleApiError(err); }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await mustBeAdmin(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const dto = medicalUpdateSchema.parse(await req.json());
        const previous = await getMedical(ocId, id);
        if (!previous) throw new ApiError(404, 'Medical record not found', 'not_found');
        const row = await updateMedical(ocId, id, dto);
        if (!row) throw new ApiError(404, 'Medical record not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.OC_RECORD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Updated medical record ${id} for OC ${ocId}`,
                ocId,
                module: 'medical',
                recordId: id,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'Medical record updated successfully.', data: row });
    } catch (err) { return handleApiError(err); }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await mustBeAdmin(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const row = await deleteMedical(ocId, id); if (!row) throw new ApiError(404, 'Medical record not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.OC_RECORD_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Deleted medical record ${id} for OC ${ocId}`,
                ocId,
                module: 'medical',
                recordId: id,
                hardDeleted: true,
            },
        });
        return json.ok({ message: 'Medical record deleted successfully.', id: row.id });
    } catch (err) { return handleApiError(err); }
}
export const GET = withAuditRoute('GET', GETHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
