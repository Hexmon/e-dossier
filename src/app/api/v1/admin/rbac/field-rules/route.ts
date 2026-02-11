import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { rbacFieldRuleCreateSchema } from '@/app/lib/validators.rbac';
import { createFieldRule, listFieldRules } from '@/app/db/queries/rbac-admin';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);
    const sp = new URL(req.url).searchParams;

    const permissionId = sp.get('permissionId') ?? undefined;
    const positionId = sp.get('positionId') ?? undefined;
    const roleId = sp.get('roleId') ?? undefined;

    const items = await listFieldRules({ permissionId, positionId, roleId });

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.PERMISSION, id: 'field_rule_collection' },
      metadata: {
        description: 'RBAC field rules retrieved successfully.',
        count: items.length,
      },
    });

    return json.ok({ message: 'Field rules retrieved successfully.', items, count: items.length });
  } catch (error) {
    return handleApiError(error);
  }
}

async function POSTHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);
    const body = rbacFieldRuleCreateSchema.parse(await req.json());
    const created = await createFieldRule(body);

    await req.audit.log({
      action: AuditEventType.PERMISSION_GRANTED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.PERMISSION, id: created.permissionId },
      metadata: {
        description: 'RBAC field rule created successfully.',
        ruleId: created.id,
        mode: created.mode,
        fieldCount: created.fields.length,
      },
    });

    return json.created({ message: 'Field rule created successfully.', rule: created });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));
export const POST = withAuditRoute('POST', withAuthz(POSTHandler));
