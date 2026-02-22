import { requireAdmin } from '@/app/lib/authz';
import { handleApiError, json, ApiError } from '@/app/lib/http';
import { getPlatoonCommanderHistoryByIdOrKey } from '@/app/db/queries/platoon-commanders';
import {
  AuditEventType,
  AuditResourceType,
  withAuditRoute,
  type AuditNextRequest,
} from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ idOrKey: string }> }) {
  try {
    const auth = await requireAdmin(req);
    const { idOrKey: rawIdOrKey } = await params;
    const idOrKey = decodeURIComponent(rawIdOrKey || '').trim();

    if (!idOrKey) {
      throw new ApiError(400, 'idOrKey path param is required.', 'bad_request');
    }

    const result = await getPlatoonCommanderHistoryByIdOrKey(idOrKey);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: auth.userId },
      target: { type: AuditResourceType.API, id: 'admin:platoons:commander-history:get' },
      metadata: {
        description: 'Platoon commander history retrieved.',
        platoonId: result.platoon.id,
        idOrKey,
        count: result.items.length,
      },
    });

    return json.ok({
      message: 'Platoon commander history retrieved successfully.',
      platoon: result.platoon,
      items: result.items,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute('GET', GETHandler);
