import { handleApiError, json } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import {
  listMarksWorkflowSettingsForAdmin,
  updateMarksWorkflowSettingsForAdmin,
} from '@/app/services/marksReviewWorkflow';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    const settings = await listMarksWorkflowSettingsForAdmin();

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.API, id: 'marks-review-workflow-settings' },
      metadata: {
        description: 'Retrieved marks review workflow settings.',
      },
    });

    return json.ok({
      message: 'Marks review workflow settings retrieved successfully.',
      settings,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

async function PUTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    const settings = await updateMarksWorkflowSettingsForAdmin(await req.json(), authCtx.userId);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.API, id: 'marks-review-workflow-settings' },
      metadata: {
        description: 'Updated marks review workflow settings.',
      },
    });

    return json.ok({
      message: 'Marks review workflow settings updated successfully.',
      settings,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withAuditRoute('GET', GETHandler);
export const PUT = withAuditRoute('PUT', PUTHandler);
