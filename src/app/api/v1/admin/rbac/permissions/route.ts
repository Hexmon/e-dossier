import { json, handleApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { rbacPermissionCreateSchema } from '@/app/lib/validators.rbac';
import { createRbacPermission, listRbacPermissions } from '@/app/db/queries/rbac-admin';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    const sp = new URL(req.url).searchParams;

    const q = sp.get('q') ?? undefined;
    const limit = sp.get('limit') ? Number(sp.get('limit')) : undefined;
    const offset = sp.get('offset') ? Number(sp.get('offset')) : undefined;

    const items = await listRbacPermissions({ q, limit, offset });

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.PERMISSION, id: 'collection' },
      metadata: {
        description: 'RBAC permissions retrieved successfully.',
        count: items.length,
      },
    });

    return json.ok({ message: 'Permissions retrieved successfully.', items, count: items.length });
  } catch (error) {
    return handleApiError(error);
  }
}

async function POSTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAdmin(req);
    const body = rbacPermissionCreateSchema.parse(await req.json());
    const created = await createRbacPermission(body);

    await req.audit.log({
      action: AuditEventType.PERMISSION_GRANTED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.PERMISSION, id: created.id },
      metadata: {
        description: `Created RBAC permission ${created.key}`,
        permissionId: created.id,
        key: created.key,
      },
    });

    return json.created({ message: 'Permission created successfully.', permission: created });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));
export const POST = withAuditRoute('POST', withAuthz(POSTHandler));
