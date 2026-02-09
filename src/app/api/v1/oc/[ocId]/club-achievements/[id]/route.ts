import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, clubAchievementUpdateSchema } from '@/app/lib/oc-validators';
import { getClubAchievement, updateClubAchievement, deleteClubAchievement } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const authCtx = await mustBeAuthed(req);
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);
    const { id } = await parseParam({ params }, IdSchema);
    const row = await getClubAchievement(ocId, id);
    if (!row) throw new ApiError(404, 'Club achievement not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Club achievement ${row.id} retrieved successfully.`,
        ocId,
        module: 'club_achievements',
        recordId: row.id,
      },
    });

    return json.ok({ message: 'Club achievement retrieved successfully.', data: row });
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
    const dto = clubAchievementUpdateSchema.parse(await req.json());
    const row = await updateClubAchievement(ocId, id, dto);
    if (!row) throw new ApiError(404, 'Club achievement not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.OC_RECORD_UPDATED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Updated club achievement ${row.id} for OC ${ocId}`,
        ocId,
        module: 'club_achievements',
        recordId: row.id,
        changes: Object.keys(dto),
      },
    });

    return json.ok({ message: 'Club achievement updated successfully.', data: row });
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
    const sp = new URL(req.url).searchParams;
    const hard = sp.get('hard') === 'true';
    const row = await deleteClubAchievement(ocId, id, { hard });
    if (!row) throw new ApiError(404, 'Club achievement not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.OC_RECORD_DELETED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `${hard ? 'Hard' : 'Soft'} deleted club achievement ${id} for OC ${ocId}`,
        ocId,
        module: 'club_achievements',
        recordId: row.id,
        hardDeleted: hard,
      },
    });

    return json.ok({
      message: hard ? 'Club achievement hard-deleted.' : 'Club achievement soft-deleted.',
      id: row.id,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withAuditRoute('GET', GETHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
