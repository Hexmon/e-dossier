// src/app/api/v1/admin/signup-requests/[id]/reject/route.ts
import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { rejectSignupRequestSchema } from '@/app/lib/validators';
import { rejectSignupRequest } from '@/app/db/queries/signupRequests';
import { IdSchema } from '@/app/lib/apiClient';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function POSTHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Who is acting
    const { userId: adminUserId } = await requireAdmin(req);

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

    await createAuditLog({
      actorUserId: adminUserId,
      eventType: AuditEventType.SIGNUP_REQUEST_REJECTED,
      resourceType: AuditResourceType.SIGNUP_REQUEST,
      resourceId: id,
      description: `Signup request ${id} rejected`,
      metadata: {
        requestId: id,
        reason: dto.reason,
      },
      request: req,
      required: true,
    });

    return json.ok({ message: 'Signup request rejected successfully.' });
  } catch (err) {
    return handleApiError(err);
  }
}
export const POST = withRouteLogging('POST', POSTHandler);
