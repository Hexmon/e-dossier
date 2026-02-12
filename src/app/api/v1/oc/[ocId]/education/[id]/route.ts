import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, eduUpdateSchema } from '@/app/lib/oc-validators';
import { getEdu, updateEdu, deleteEdu } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const authCtx = await mustBeAuthed(req);
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);
    const { id } = await parseParam({ params }, IdSchema);
    const row = await getEdu(ocId, id);
    if (!row) throw new ApiError(404, 'Education record not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Education record ${row.id} retrieved successfully.`,
        ocId,
        module: 'education',
        recordId: row.id,
      },
    });

    return json.ok({ message: 'Education record retrieved successfully.', data: row });
  } catch (err) {
    return handleApiError(err);
  }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const authCtx = await mustBeAuthed(req);
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);
    const { id } = await parseParam({ params }, IdSchema);
    const dto = eduUpdateSchema.parse(await req.json());
    // totalPercent is now text column; stringify the validated value
    const { totalPercent, ...rest } = dto;
    const updateData: Record<string, unknown> = { ...rest };
    if (totalPercent !== undefined) updateData.totalPercent = String(totalPercent);
    const row = await updateEdu(ocId, id, updateData as any);
    if (!row) throw new ApiError(404, 'Education record not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.OC_RECORD_UPDATED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Updated education record ${row.id} for OC ${ocId}`,
        ocId,
        module: 'education',
        recordId: row.id,
        changes: Object.keys(dto),
      },
    });

    return json.ok({ message: 'Education record updated successfully.', data: row });
  } catch (err) {
    return handleApiError(err);
  }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const authCtx = await mustBeAuthed(req);
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);
    const { id } = await parseParam({ params }, IdSchema);
    const row = await deleteEdu(ocId, id);
    if (!row) throw new ApiError(404, 'Education record not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.OC_RECORD_DELETED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Deleted education record ${id} for OC ${ocId}`,
        ocId,
        module: 'education',
        recordId: row.id,
        hardDeleted: false,
      },
    });

    return json.ok({ message: 'Education record deleted successfully.', id: row.id });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withAuditRoute('GET', GETHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
