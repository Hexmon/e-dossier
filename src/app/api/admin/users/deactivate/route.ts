// src/app/api/admin/users/deactivate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../db/client';
import { users } from '../../../../db/schema/auth/users';
import { refreshTokens } from '../../../../db/schema/auth/tokens';
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

  await db.transaction(async (tx) => {
    await tx.update(users).set({ isActive: false, deactivatedAt: new Date() }).where(eq(users.id, userId));
    await tx.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.userId, userId));
  });

  return NextResponse.json({ ok: true });
}
