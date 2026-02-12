import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, specialAchievementInFiringUpdateSchema } from '@/app/lib/oc-validators';
import { getSpecialAchievementInFiring, updateSpecialAchievementInFiring, deleteSpecialAchievementInFiring } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const authCtx = await mustBeAuthed(req);
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);
    const { id } = await parseParam({ params }, IdSchema);
    const row = await getSpecialAchievementInFiring(ocId, id);
    if (!row) throw new ApiError(404, 'Special achievement record not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Special achievement in firing ${row.id} retrieved successfully.`,
        ocId,
        module: 'special_achievement_in_firing',
        recordId: row.id,
      },
    });

    return json.ok({ message: 'Special achievement in firing retrieved successfully.', data: row });
  } catch (err) {
    return handleApiError(err);
  }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const authCtx = await mustBeAdmin(req);
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);
    const { id } = await parseParam({ params }, IdSchema);
    const dto = specialAchievementInFiringUpdateSchema.parse(await req.json());
    const row = await updateSpecialAchievementInFiring(ocId, id, dto);
    if (!row) throw new ApiError(404, 'Special achievement record not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.OC_RECORD_UPDATED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Updated special achievement in firing ${row.id} for OC ${ocId}`,
        ocId,
        module: 'special_achievement_in_firing',
        recordId: row.id,
        changes: Object.keys(dto),
      },
    });

    return json.ok({ message: 'Special achievement in firing updated successfully.', data: row });
  } catch (err) {
    return handleApiError(err);
  }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const authCtx = await mustBeAdmin(req);
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);
    const { id } = await parseParam({ params }, IdSchema);
    const sp = new URL(req.url).searchParams;
    const hard = sp.get('hard') === 'true';
    const row = await deleteSpecialAchievementInFiring(ocId, id, { hard });
    if (!row) throw new ApiError(404, 'Special achievement record not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.OC_RECORD_DELETED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `${hard ? 'Hard' : 'Soft'} deleted special achievement in firing ${id} for OC ${ocId}`,
        ocId,
        module: 'special_achievement_in_firing',
        recordId: row.id,
        hardDeleted: hard,
      },
    });

    return json.ok({
      message: hard ? 'Special achievement in firing hard-deleted.' : 'Special achievement in firing soft-deleted.',
      id: row.id,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withAuditRoute('GET', GETHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
