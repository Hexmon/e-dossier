import { ApiError, handleApiError, json } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { rbacRoleUpdateSchema } from '@/app/lib/validators.rbac';
import { deleteRbacRole, getRbacRoleById, updateRbacRole } from '@/app/db/queries/rbac-admin';

export const runtime = 'nodejs';

const IMMUTABLE_ROLES = new Set(['admin', 'super_admin']);

async function PATCHHandler(
  req: AuditNextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    const authCtx = await requireAdmin(req);
    const { roleId } = await params;
    if (!roleId) throw new ApiError(400, 'roleId is required', 'bad_request');

    const existing = await getRbacRoleById(roleId);
    if (!existing) throw new ApiError(404, 'Role not found', 'not_found');
    if (IMMUTABLE_ROLES.has(existing.key.toLowerCase())) {
      throw new ApiError(403, `Role ${existing.key} is immutable`, 'forbidden');
    }

    const payload = rbacRoleUpdateSchema.parse(await req.json());
    const updated = await updateRbacRole(roleId, payload);
    if (!updated) throw new ApiError(404, 'Role not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.ROLE_ASSIGNED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.ROLE, id: updated.id },
      metadata: {
        description: `RBAC role updated: ${updated.key}`,
        roleId: updated.id,
        changes: Object.keys(payload),
      },
    });

    return json.ok({
      message: 'RBAC role updated successfully.',
      role: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function DELETEHandler(
  req: AuditNextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    const authCtx = await requireAdmin(req);
    const { roleId } = await params;
    if (!roleId) throw new ApiError(400, 'roleId is required', 'bad_request');

    const existing = await getRbacRoleById(roleId);
    if (!existing) throw new ApiError(404, 'Role not found', 'not_found');
    if (IMMUTABLE_ROLES.has(existing.key.toLowerCase())) {
      throw new ApiError(403, `Role ${existing.key} is immutable`, 'forbidden');
    }

    const deleted = await deleteRbacRole(roleId);
    if (!deleted) throw new ApiError(404, 'Role not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.ROLE_REVOKED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.ROLE, id: deleted.id },
      metadata: {
        description: `RBAC role deleted: ${deleted.key}`,
        roleId: deleted.id,
      },
    });

    return json.ok({
      message: 'RBAC role deleted successfully.',
      role: deleted,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = withAuditRoute('PATCH', withAuthz(PATCHHandler));
export const DELETE = withAuditRoute('DELETE', withAuthz(DELETEHandler));
