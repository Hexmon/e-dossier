// src/app/api/v1/admin/signup-requests/route.ts
import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, hasAdminRole, requireAuth } from '@/app/lib/authz';
import { listSignupRequests } from '@/app/db/queries/signupRequests';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest) {
  try {
    await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get('status') ?? 'pending') as 'pending' | 'approved' | 'rejected' | 'cancelled';
    const rows = await listSignupRequests(status);

    await createAuditLog({
      actorUserId: null,
      eventType: AuditEventType.API_REQUEST,
      resourceType: AuditResourceType.SIGNUP_REQUEST,
      resourceId: null,
      description: 'Listed signup requests',
      metadata: { status, count: rows.length },
      request: req,
    });
    return json.ok({ message: 'Signup requests retrieved successfully.', items: rows });
  } catch (err) {
    return handleApiError(err);
  }
}
export const GET = withRouteLogging('GET', GETHandler);
