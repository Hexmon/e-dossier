// src/app/api/v1/admin/signup-requests/[id]/reject/route.ts
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { rejectSignupRequestSchema } from '@/app/lib/validators';
import { rejectSignupRequest } from '@/app/db/queries/signupRequests';
import { IdSchema } from '@/app/lib/apiClient';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { withAuthz } from '@/app/lib/acx/withAuthz';

export const runtime = 'nodejs';

async function POSTHandler(
  req: AuditNextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Who is acting
    const { userId: adminUserId } = await requireAuth(req);

    // Await dynamic params once (Next.js requirement)
    const { id: raw } = await params;
    const { id } = IdSchema.parse({ id: decodeURIComponent((raw ?? '')).trim() });

    // Validate body
    const body = await req.json();
    const dto = rejectSignupRequestSchema.parse(body);

    // Perform rejection (DB + audit inside the query helper)
    await rejectSignupRequest({
      requestId: id,
      adminUserId,
      reason: dto.reason,
      auditRequestId: req.headers.get('x-request-id') ?? undefined,
    });

    await req.audit.log({
      action: AuditEventType.SIGNUP_REQUEST_REJECTED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: adminUserId },
      target: { type: AuditResourceType.SIGNUP_REQUEST, id: id },
      metadata: {
        description: `Signup request ${id} rejected`,
        requestId: id,
        reason: dto.reason,
      },
    });

    return json.ok({ message: 'Signup request rejected successfully.' });
  } catch (err) {
    return handleApiError(err);
  }
}
export const POST = withAuditRoute('POST', withAuthz(POSTHandler));
