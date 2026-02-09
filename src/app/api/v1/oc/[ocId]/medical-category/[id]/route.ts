import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, medCatUpdateSchema } from '@/app/lib/oc-validators';
import { getMedCat, updateMedCat, deleteMedCat } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const authCtx = await mustBeAuthed(req);
    const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
    const { id } = await parseParam({params}, IdSchema);
    const row = await getMedCat(ocId, id); if (!row) throw new ApiError(404,'Medical category not found','not_found');

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Medical category record ${row.id} retrieved successfully.`,
        ocId,
        module: 'medical_category',
        recordId: row.id,
      },
    });

    return json.ok({ message: 'Medical category record retrieved successfully.', data: row });
  } catch (err) { return handleApiError(err); }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try { const adminCtx = await mustBeAdmin(req);
    const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
    const { id } = await parseParam({params}, IdSchema);
    const dto = medCatUpdateSchema.parse(await req.json());
    const row = await updateMedCat(ocId, id, dto); if (!row) throw new ApiError(404,'Medical category not found','not_found');

    await req.audit.log({
      action: AuditEventType.OC_RECORD_UPDATED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: adminCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Updated medical category record ${id} for OC ${ocId}`,
        ocId,
        module: 'medical_category',
        recordId: id,
        changes: Object.keys(dto),
      },
    });
    return json.ok({ message: 'Medical category record updated successfully.', data: row });
  } catch (err) { return handleApiError(err); }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try { const adminCtx = await mustBeAdmin(req);
    const { ocId } = await parseParam({params}, OcIdParam); await ensureOcExists(ocId);
    const { id } = await parseParam({params}, IdSchema);
    const row = await deleteMedCat(ocId, id); if (!row) throw new ApiError(404,'Medical category not found','not_found');

    await req.audit.log({
      action: AuditEventType.OC_RECORD_DELETED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: adminCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Deleted medical category record ${id} for OC ${ocId}`,
        ocId,
        module: 'medical_category',
        recordId: id,
        hardDeleted: true,
      },
    });
    return json.ok({ message: 'Medical category record deleted successfully.', id: row.id });
  } catch (err) { return handleApiError(err); }
}
export const GET = withAuditRoute('GET', GETHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
