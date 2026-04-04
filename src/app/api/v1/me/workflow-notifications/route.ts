import { handleApiError, json } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import {
  applyWorkflowNotificationAction,
  listMyWorkflowNotifications,
} from '@/app/services/marksReviewWorkflow';
import { workflowNotificationActionSchema } from '@/app/lib/marks-review-workflow';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);
    const notifications = await listMyWorkflowNotifications(authCtx.userId);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.API, id: 'workflow-notifications' },
      metadata: {
        description: 'Retrieved workflow notifications for current user.',
      },
    });

    return json.ok({
      message: 'Workflow notifications retrieved successfully.',
      items: notifications,
      count: notifications.length,
      unreadCount: notifications.filter((item: (typeof notifications)[number]) => !item.readAt).length,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

async function POSTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);
    const action = workflowNotificationActionSchema.parse(await req.json());
    const notifications = await applyWorkflowNotificationAction(authCtx.userId, action);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.API, id: 'workflow-notifications' },
      metadata: {
        description: `Applied workflow notification action ${action.action}.`,
        notificationAction: action.action,
      },
    });

    return json.ok({
      message: 'Workflow notification action applied successfully.',
      items: notifications,
      count: notifications.length,
      unreadCount: notifications.filter((item: (typeof notifications)[number]) => !item.readAt).length,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withAuditRoute('GET', GETHandler);
export const POST = withAuditRoute('POST', POSTHandler);
