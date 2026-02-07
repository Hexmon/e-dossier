import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, medicalUpdateSchema } from '@/app/lib/oc-validators';
import { getMedical, updateMedical, deleteMedical } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const row = await getMedical(ocId, id); if (!row) throw new ApiError(404, 'Medical record not found', 'not_found');
        return json.ok({ message: 'Medical record retrieved successfully.', data: row });
    } catch (err) { return handleApiError(err); }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const dto = medicalUpdateSchema.parse(await req.json());
        const previous = await getMedical(ocId, id);
        if (!previous) throw new ApiError(404, 'Medical record not found', 'not_found');
        const row = await updateMedical(ocId, id, dto);
        if (!row) throw new ApiError(404, 'Medical record not found', 'not_found');

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_UPDATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Updated medical record ${id} for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'medical',
                recordId: id,
                changes: Object.keys(dto),
            },
            before: previous,
            after: row,
            changedFields: Object.keys(dto),
            request: req,
            required: true,
        });
        return json.ok({ message: 'Medical record updated successfully.', data: row });
    } catch (err) { return handleApiError(err); }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
        const { id } = await parseParam({params}, IdSchema);
        const row = await deleteMedical(ocId, id); if (!row) throw new ApiError(404, 'Medical record not found', 'not_found');

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_DELETED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Deleted medical record ${id} for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'medical',
                recordId: id,
                hardDeleted: true,
            },
            before: row,
            after: null,
            request: req,
            required: true,
        });
        return json.ok({ message: 'Medical record deleted successfully.', id: row.id });
    } catch (err) { return handleApiError(err); }
}
export const GET = withRouteLogging('GET', GETHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);
