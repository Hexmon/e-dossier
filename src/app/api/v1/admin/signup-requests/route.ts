import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { listSignupRequests } from '@/app/db/queries/signupRequests';

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get('status') ?? 'pending') as 'pending'|'approved'|'rejected'|'cancelled';
    const rows = await listSignupRequests(status);
    return json.ok({ items: rows });
  } catch (err) {
    return handleApiError(err);
  }
}
