import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/guard';
import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const principal = await requireAuth(req);

    const [u] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        phone: users.phone,
        name: users.name,
        rank: users.rank,
        currentAppointmentId: users.appointId
      })
      .from(users)
      .where(eq(users.id, principal.userId));

    if (!u) return json.notFound('User not found');
    return json.ok({ user: u, roles: principal.roles, apt: principal.apt ?? null });
  } catch (err) {
    return handleApiError(err);
  }
}
