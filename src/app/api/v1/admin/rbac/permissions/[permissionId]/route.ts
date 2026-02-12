import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { rbacPermissionUpdateSchema } from '@/app/lib/validators.rbac';
import { deleteRbacPermission, updateRbacPermission } from '@/app/db/queries/rbac-admin';

export const runtime = 'nodejs';

async function PATCHHandler(
  req: AuditNextRequest,
  { params }: { params: Promise<{ permissionId: string }> }
) {
  try {
    const authCtx = await requireAdmin(req);
    const { permissionId } = await params;
    if (!permissionId) throw new ApiError(400, 'permissionId is required', 'bad_request');

    const body = rbacPermissionUpdateSchema.parse(await req.json());
    const updated = await updateRbacPermission(permissionId, body);
    if (!updated) throw new ApiError(404, 'Permission not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.PERMISSION_GRANTED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.PERMISSION, id: updated.id },
      metadata: {
        description: `Updated RBAC permission ${updated.key}`,
        permissionId: updated.id,
      },
    });

    return json.ok({ message: 'Permission updated successfully.', permission: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

async function DELETEHandler(
  req: AuditNextRequest,
  { params }: { params: Promise<{ permissionId: string }> }
) {
  try {
    const authCtx = await requireAdmin(req);
    const { permissionId } = await params;
    if (!permissionId) throw new ApiError(400, 'permissionId is required', 'bad_request');

    const deleted = await deleteRbacPermission(permissionId);
    if (!deleted) throw new ApiError(404, 'Permission not found', 'not_found');

    await req.audit.log({
      action: AuditEventType.PERMISSION_REVOKED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.PERMISSION, id: deleted.id },
      metadata: {
        description: `Deleted RBAC permission ${deleted.key}`,
        permissionId: deleted.id,
      },
    });

    return json.ok({ message: 'Permission deleted successfully.', permission: deleted });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = withAuditRoute('PATCH', withAuthz(PATCHHandler));
export const DELETE = withAuditRoute('DELETE', withAuthz(DELETEHandler));
