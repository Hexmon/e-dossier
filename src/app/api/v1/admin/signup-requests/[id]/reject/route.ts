// src/app/api/v1/admin/signup-requests/[id]/reject/route.ts
import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { rejectSignupRequestSchema } from '@/app/lib/validators';
import { rejectSignupRequest } from '@/app/db/queries/signupRequests';
import { IdSchema } from '@/app/lib/apiClient';

export async function POST(
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
    await rejectSignupRequest({ requestId: id, adminUserId, reason: dto.reason });

    return json.ok({ message: 'Signup request rejected successfully.' });
  } catch (err) {
    return handleApiError(err);
  }
}
