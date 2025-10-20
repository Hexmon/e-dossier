import { NextRequest } from 'next/server';
import { db } from '@/app/db/client';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { rejectSignupRequestSchema } from '@/app/lib/validators';
import { signupRequests } from '@/app/db/schema/auth/signupRequests';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const IdSchema = z.object({ id: z.string().uuid() });

export async function POST(req: NextRequest, ctx: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);

    const { id: rawId } = await (ctx as any).params;
    const { id } = IdSchema.parse({ id: decodeURIComponent((rawId ?? '')).trim() });

    const body = await req.json();
    const dto = rejectSignupRequestSchema.parse(body);

    const [reqRow] = await db.select({ id: signupRequests.id, status: signupRequests.status })
      .from(signupRequests)
      .where(eq(signupRequests.id, id))
      .limit(1);

    if (!reqRow) throw new ApiError(404, 'Signup request not found', 'not_found');
    if (reqRow.status !== 'pending') throw new ApiError(409, 'Request already resolved', 'conflict');

    await db.update(signupRequests).set({
      status: 'rejected',
      resolvedAt: new Date(),
      adminReason: dto.reason,
    }).where(eq(signupRequests.id, id));

    return json.ok({ message: 'Signup request rejected' });
  } catch (err) {
    return handleApiError(err);
  }
}
