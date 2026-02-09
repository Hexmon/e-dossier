import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, disciplineUpdateSchema } from '@/app/lib/oc-validators';
import { getDiscipline, updateDiscipline, deleteDiscipline } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const authCtx = await mustBeAuthed(req);
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);
    const { id } = await parseParam({ params }, IdSchema);
    const row = await getDiscipline(ocId, id);
    if (!row) throw new ApiError(404, 'Discipline record not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Discipline record ${row.id} retrieved successfully.`,
        ocId,
        module: 'discipline',
        recordId: row.id,
      },
    });

    return json.ok({ message: 'Discipline record retrieved successfully.', data: row });
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
    const dto = disciplineUpdateSchema.parse(await req.json());
    const row = await updateDiscipline(ocId, id, dto);
    if (!row) throw new ApiError(404, 'Discipline record not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.OC_RECORD_UPDATED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: adminCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Updated discipline record ${row.id} for OC ${ocId}`,
        ocId,
        module: 'discipline',
        recordId: row.id,
        changes: Object.keys(dto),
      },
    });

    return json.ok({ message: 'Discipline record updated successfully.', data: row });
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
    const row = await deleteDiscipline(ocId, id);
    if (!row) throw new ApiError(404, 'Discipline record not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.OC_RECORD_DELETED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: adminCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Deleted discipline record ${id} for OC ${ocId}`,
        ocId,
        module: 'discipline',
        recordId: row.id,
        hardDeleted: false,
      },
    });

    return json.ok({ message: 'Discipline record deleted successfully.', id: row.id });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withAuditRoute('GET', GETHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
