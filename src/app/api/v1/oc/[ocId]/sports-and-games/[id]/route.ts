import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, mustBeAdmin, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam, sportsAndGamesUpdateSchema } from '@/app/lib/oc-validators';
import { getSportsAndGames, updateSportsAndGames, deleteSportsAndGames } from '@/app/db/queries/oc';
import { IdSchema } from '@/app/lib/apiClient';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
  try {
    const authCtx = await mustBeAuthed(req);
    const { ocId } = await parseParam({ params }, OcIdParam);
    await ensureOcExists(ocId);
    const { id } = await parseParam({ params }, IdSchema);
    const row = await getSportsAndGames(ocId, id);
    if (!row) throw new ApiError(404, 'Sports/games record not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Sports and games record ${row.id} retrieved successfully.`,
        ocId,
        module: 'sports_and_games',
        recordId: row.id,
      },
    });

    return json.ok({ message: 'Sports and games record retrieved successfully.', data: row });
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
    const dto = sportsAndGamesUpdateSchema.parse(await req.json());
    const row = await updateSportsAndGames(ocId, id, dto);
    if (!row) throw new ApiError(404, 'Sports/games record not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.OC_RECORD_UPDATED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `Updated sports/games record ${row.id} for OC ${ocId}`,
        ocId,
        module: 'sports_and_games',
        recordId: row.id,
        changes: Object.keys(dto),
      },
    });

    return json.ok({ message: 'Sports and games record updated successfully.', data: row });
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
    const row = await deleteSportsAndGames(ocId, id, { hard });
    if (!row) throw new ApiError(404, 'Sports/games record not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.OC_RECORD_DELETED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.OC, id: ocId },
      metadata: {
        description: `${hard ? 'Hard' : 'Soft'} deleted sports/games record ${id} for OC ${ocId}`,
        ocId,
        module: 'sports_and_games',
        recordId: row.id,
        hardDeleted: hard,
      },
    });

    return json.ok({
      message: hard ? 'Sports and games record hard-deleted.' : 'Sports and games record soft-deleted.',
      id: row.id,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withAuditRoute('GET', GETHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
