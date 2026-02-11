import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { rbacFieldRuleUpdateSchema } from '@/app/lib/validators.rbac';
import { deleteFieldRule, updateFieldRule } from '@/app/db/queries/rbac-admin';

export const runtime = 'nodejs';

async function PATCHHandler(
  req: AuditNextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  try {
    const authCtx = await requireAuth(req);
    const { ruleId } = await params;
    if (!ruleId) throw new ApiError(400, 'ruleId is required', 'bad_request');

    const body = rbacFieldRuleUpdateSchema.parse(await req.json());
    const updated = await updateFieldRule(ruleId, body);
    if (!updated) throw new ApiError(404, 'Field rule not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.PERMISSION_GRANTED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.PERMISSION, id: updated.permissionId },
      metadata: {
        description: 'RBAC field rule updated successfully.',
        ruleId: updated.id,
      },
    });

    return json.ok({ message: 'Field rule updated successfully.', rule: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

async function DELETEHandler(
  req: AuditNextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  try {
    const authCtx = await requireAuth(req);
    const { ruleId } = await params;
    if (!ruleId) throw new ApiError(400, 'ruleId is required', 'bad_request');

    const deleted = await deleteFieldRule(ruleId);
    if (!deleted) throw new ApiError(404, 'Field rule not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.PERMISSION_REVOKED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.PERMISSION, id: deleted.permissionId },
      metadata: {
        description: 'RBAC field rule deleted successfully.',
        ruleId: deleted.id,
      },
    });

    return json.ok({ message: 'Field rule deleted successfully.', rule: deleted });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = withAuditRoute('PATCH', withAuthz(PATCHHandler));
export const DELETE = withAuditRoute('DELETE', withAuthz(DELETEHandler));
