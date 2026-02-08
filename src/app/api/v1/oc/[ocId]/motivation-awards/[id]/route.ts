import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, motivationAwardUpdateSchema } from '@/app/lib/oc-validators';
import { getMotivationAward, updateMotivationAward, deleteMotivationAward } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const authCtx = await mustBeAuthed(req);
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);
    const { id } = await parseParam({ params }, IdSchema);
    const row = await getMotivationAward(ocId, id);
    if (!row) throw new ApiError(404, 'Motivation award not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Motivation award ${row.id} retrieved successfully.`,
        ocId,
        module: 'motivation_awards',
        recordId: row.id,
      },
    });

    return json.ok({ message: 'Motivation award retrieved successfully.', data: row });
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
    const dto = motivationAwardUpdateSchema.parse(await req.json());
    const row = await updateMotivationAward(ocId, id, dto);
    if (!row) throw new ApiError(404, 'Motivation award not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.OC_RECORD_UPDATED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: adminCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Updated motivation award ${row.id} for OC ${ocId}`,
        ocId,
        module: 'motivation_awards',
        recordId: row.id,
        changes: Object.keys(dto),
      },
    });

    return json.ok({ message: 'Motivation award updated successfully.', data: row });
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
    const sp = new URL(req.url).searchParams;
    const hard = sp.get('hard') === 'true';
    const row = await deleteMotivationAward(ocId, id, { hard });
    if (!row) throw new ApiError(404, 'Motivation award not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.OC_RECORD_DELETED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: adminCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `${hard ? 'Hard' : 'Soft'} deleted motivation award ${id} for OC ${ocId}`,
        ocId,
        module: 'motivation_awards',
        recordId: row.id,
        hardDeleted: hard,
      },
    });

    return json.ok({
      message: hard ? 'Motivation award hard-deleted.' : 'Motivation award soft-deleted.',
      id: row.id,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withAuditRoute('GET', GETHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
