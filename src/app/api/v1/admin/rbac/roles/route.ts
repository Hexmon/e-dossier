import { json, handleApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { rbacRoleCreateSchema } from '@/app/lib/validators.rbac';
import { createRbacRole, listRbacPositions, listRbacRoles } from '@/app/db/queries/rbac-admin';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    const [roles, positions] = await Promise.all([listRbacRoles(), listRbacPositions()]);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.ROLE, id: 'collection' },
      metadata: {
        description: 'RBAC roles and positions retrieved successfully.',
        roleCount: roles.length,
        positionCount: positions.length,
      },
    });

    return json.ok({
      message: 'RBAC roles and positions retrieved successfully.',
      roles,
      positions,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function POSTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    const payload = rbacRoleCreateSchema.parse(await req.json());
    const created = await createRbacRole(payload);

    await req.audit.log({
      action: AuditEventType.ROLE_ASSIGNED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.ROLE, id: created.id },
      metadata: {
        description: `RBAC role created: ${created.key}`,
        roleId: created.id,
        key: created.key,
      },
    });

    return json.created({
      message: 'RBAC role created successfully.',
      role: created,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));
export const POST = withAuditRoute('POST', withAuthz(POSTHandler));
