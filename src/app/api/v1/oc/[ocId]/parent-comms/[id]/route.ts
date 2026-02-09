import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, commUpdateSchema } from '@/app/lib/oc-validators';
import { getComm, updateComm, deleteComm } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const authCtx = await mustBeAuthed(req);
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);
    const { id } = await parseParam({ params }, IdSchema);
    const row = await getComm(ocId, id);
    if (!row) throw new ApiError(404, 'Communication not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Parent communication ${row.id} retrieved successfully.`,
        ocId,
        module: 'parent_comms',
        recordId: row.id,
      },
    });

    return json.ok({ message: 'Parent communication retrieved successfully.', data: row });
  } catch (err) {
    return handleApiError(err);
  }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const adminCtx = await mustBeAdmin(req);
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);
    const { id } = await parseParam({ params }, IdSchema);
    const dto = commUpdateSchema.parse(await req.json());
    const row = await updateComm(ocId, id, dto);
    if (!row) throw new ApiError(404, 'Communication not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.OC_RECORD_UPDATED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: adminCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Updated parent communication ${id} for OC ${ocId}`,
        ocId,
        module: 'parent_comms',
        recordId: id,
        changes: Object.keys(dto),
      },
    });

    return json.ok({ message: 'Parent communication updated successfully.', data: row });
  } catch (err) {
    return handleApiError(err);
  }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const adminCtx = await mustBeAdmin(req);
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);
    const { id } = await parseParam({ params }, IdSchema);
    const row = await deleteComm(ocId, id);
    if (!row) throw new ApiError(404, 'Communication not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.OC_RECORD_DELETED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: adminCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Deleted parent communication ${id} for OC ${ocId}`,
        ocId,
        module: 'parent_comms',
        recordId: id,
        hardDeleted: true,
      },
    });

    return json.ok({ message: 'Parent communication deleted successfully.', id: row.id });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withAuditRoute('GET', GETHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
