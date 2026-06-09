import { handleApiError, json } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import {
  applyWarningNotificationAction,
  listMyWarningNotifications,
} from '@/app/services/warningManagement';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);
    const notifications = await listMyWarningNotifications(authCtx);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.API, id: 'warning-notifications' },
      metadata: { description: 'Retrieved warning notifications for current user.' },
    });

    return json.ok({
      message: 'Warning notifications retrieved successfully.',
      items: notifications,
      count: notifications.length,
      unreadCount: notifications.filter((item) => !item.readAt).length,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

async function POSTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);
    const notifications = await applyWarningNotificationAction(authCtx, await req.json());

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.API, id: 'warning-notifications' },
      metadata: { description: 'Updated warning notification read state.' },
    });

    return json.ok({
      message: 'Warning notification action applied successfully.',
      items: notifications,
      count: notifications.length,
      unreadCount: notifications.filter((item) => !item.readAt).length,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withAuditRoute('GET', GETHandler);
export const POST = withAuditRoute('POST', POSTHandler);
