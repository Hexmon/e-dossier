// src/app/api/v1/admin/signup-requests/route.ts
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { listSignupRequests } from '@/app/db/queries/signupRequests';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { withAuthz } from '@/app/lib/acx/withAuthz';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get('status') ?? 'pending') as 'pending' | 'approved' | 'rejected' | 'cancelled';
    const rows = await listSignupRequests(status);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.SIGNUP_REQUEST, id: 'collection' },
      metadata: {
        description: 'Listed signup requests',
        status,
        count: rows.length,
      },
    });
    return json.ok({ message: 'Signup requests retrieved successfully.', items: rows });
  } catch (err) {
    return handleApiError(err);
  }
}
export const GET = withAuditRoute('GET', withAuthz(GETHandler));
