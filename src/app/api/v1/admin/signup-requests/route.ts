// src/app/api/v1/admin/signup-requests/route.ts
import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, hasAdminRole } from '@/app/lib/authz';
import { listSignupRequests } from '@/app/db/queries/signupRequests';

export async function GET(req: NextRequest) {
  try {
    const { roles } = await requireAuth(req);
    if (!hasAdminRole(roles)) {
      throw new ApiError(403, 'Admin privileges required', 'forbidden');
    }

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get('status') ?? 'pending') as 'pending'|'approved'|'rejected'|'cancelled';
    const rows = await listSignupRequests(status);
    return json.ok({ items: rows });
  } catch (err) {
    return handleApiError(err);
  }
}
