import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { rbacMappingsUpdateSchema } from '@/app/lib/validators.rbac';
import {
  listPositionPermissionMappings,
  listRbacPositions,
  listRbacRoles,
  listRolePermissionMappings,
  setPositionPermissionMappings,
  setRolePermissionMappings,
} from '@/app/db/queries/rbac-admin';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    const sp = new URL(req.url).searchParams;
    const roleId = sp.get('roleId') ?? undefined;
    const positionId = sp.get('positionId') ?? undefined;

    const [roles, positions, roleMappings, positionMappings] = await Promise.all([
      listRbacRoles(),
      listRbacPositions(),
      listRolePermissionMappings(roleId),
      listPositionPermissionMappings(positionId),
    ]);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.PERMISSION, id: 'mapping_collection' },
      metadata: {
        description: 'RBAC mappings retrieved successfully.',
        roleCount: roles.length,
        positionCount: positions.length,
        roleMappingCount: roleMappings.length,
        positionMappingCount: positionMappings.length,
      },
    });

    return json.ok({
      message: 'RBAC mappings retrieved successfully.',
      roles,
      positions,
      roleMappings,
      positionMappings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function PUTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    const body = rbacMappingsUpdateSchema.parse(await req.json());

    if (!body.roleId && !body.positionId) {
      throw new ApiError(400, 'Either roleId or positionId is required', 'bad_request');
    }
    if (body.roleId && body.positionId) {
      throw new ApiError(400, 'Provide either roleId or positionId, not both', 'bad_request');
    }

    if (body.roleId) {
      await setRolePermissionMappings(body.roleId, body.permissionIds);
      await req.audit.log({
        action: AuditEventType.ROLE_ASSIGNED,
        outcome: 'SUCCESS',
        actor: { type: 'user', id: authCtx.userId },
        target: { type: AuditResourceType.ROLE, id: body.roleId },
        metadata: {
          description: 'Updated role-permission mappings.',
          roleId: body.roleId,
          permissionCount: body.permissionIds.length,
        },
      });

      return json.ok({
        message: 'Role-permission mapping updated successfully.',
        roleId: body.roleId,
        permissionIds: body.permissionIds,
      });
    }

    await setPositionPermissionMappings(body.positionId!, body.permissionIds);

    await req.audit.log({
      action: AuditEventType.PERMISSION_GRANTED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.POSITION, id: body.positionId! },
      metadata: {
        description: 'Updated position-permission mappings.',
        positionId: body.positionId,
        permissionCount: body.permissionIds.length,
      },
    });

    return json.ok({
      message: 'Position-permission mapping updated successfully.',
      positionId: body.positionId,
      permissionIds: body.permissionIds,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));
export const PUT = withAuditRoute('PUT', withAuthz(PUTHandler));
