// src/app/api/admin/users/reactivate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../db/client';
import { users } from '../../../../db/schema/auth/users';
import { eq } from 'drizzle-orm';
import { verifyAccessJWT } from '../../../../lib/jwt';
import { hasPermission } from '../../../../db/queries/authz';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value
    ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let adminId: string | undefined;
  try { adminId = (await verifyAccessJWT(token)).sub ?? undefined; } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  if (!adminId || !(await hasPermission(adminId, 'user.deactivate'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId } = await req.json();
  await db.update(users).set({ isActive: true, deactivatedAt: null }).where(eq(users.id, userId));
  return NextResponse.json({ ok: true });
}
