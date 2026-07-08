import { handleApiError, json } from '@/app/lib/http';
import { requireAdmin, requireAuth } from '@/app/lib/authz';
import {
  listWarningSettingsForAdmin,
  updateWarningSettingsForAdmin,
} from '@/app/services/warningManagement';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);
    const settings = await listWarningSettingsForAdmin();

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.API, id: 'warning-management-settings' },
      metadata: { description: 'Retrieved warning management settings.' },
    });

    return json.ok({
      message: 'Warning management settings retrieved successfully.',
      ...settings,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

async function PUTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    const settings = await updateWarningSettingsForAdmin(await req.json(), authCtx.userId);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.API, id: 'warning-management-settings' },
      metadata: { description: 'Updated warning management settings.' },
    });

    return json.ok({
      message: 'Warning management settings updated successfully.',
      ...settings,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withAuditRoute('GET', GETHandler);
export const PUT = withAuditRoute('PUT', PUTHandler);
