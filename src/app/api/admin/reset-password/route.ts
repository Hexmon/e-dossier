// src/app/api/admin/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../db/client';
import { users } from '../../../db/schema/auth/users';
import { credentialsLocal } from '../../../db/schema/auth/credentials';
import { passwordResetAdminActions } from '../../../db/schema/auth/tokens'; // if you placed it elsewhere, adjust import
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import { verifyAccessJWT } from '../../../lib/jwt';
import { hasPermission } from '../../../db/queries/authz';

const ARGON2_OPTS: argon2.Options & { type: number } = {
  type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1,
};

export async function POST(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value
    ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let adminId: string | undefined;
  try {
    const payload = await verifyAccessJWT(token);
    adminId = payload.sub ?? undefined;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await hasPermission(adminId, 'user.reset_password'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { targetUserId, newPassword, reason } = await req.json();

  const [u] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
  if (!u) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const hash = await argon2.hash(newPassword, ARGON2_OPTS);

  await db.transaction(async (tx) => {
    await tx.update(credentialsLocal)
      .set({ passwordHash: hash, passwordAlgo: 'argon2id', passwordUpdatedAt: new Date() })
      .where(eq(credentialsLocal.userId, targetUserId));

    await tx.insert(passwordResetAdminActions).values({
      adminUserId: adminId, targetUserId, reason, requestedAt: new Date(), executedAt: new Date(), status: 'completed',
    });
  });

  return NextResponse.json({ ok: true });
}
