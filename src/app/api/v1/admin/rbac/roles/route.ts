import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { listRbacPositions, listRbacRoles } from '@/app/db/queries/rbac-admin';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);
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

export const GET = withAuditRoute('GET', withAuthz(GETHandler));
