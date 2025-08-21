// src/app/api/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../db/client';
import { users } from '../../db/schema/auth/users';
import { credentialsLocal } from '../../db/schema/auth/credentials';
import { refreshTokens } from '../../db/schema/auth/tokens';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import { verifyAccessJWT } from '../../lib/jwt';
import { clearAuthCookies, setAccessCookie, setRefreshCookie } from '../../lib/cookies';
import { randomBytes, createHash } from 'crypto';

const ARGON2_OPTS: argon2.Options & { type: number } = {
  type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1,
};

export async function POST(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value
    ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let sub: string | undefined;
  try {
    const payload = await verifyAccessJWT(token);
    sub = payload.sub ?? undefined;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { oldPassword, newPassword } = await req.json();

  // read user + cred
  const [u] = await db.select().from(users).where(eq(users.id, sub)).limit(1);
  if (!u || u.deletedAt || !u.isActive || u.deactivatedAt) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const [cred] = await db.select().from(credentialsLocal).where(eq(credentialsLocal.userId, u.id)).limit(1);
  if (!cred) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ok = await argon2.verify(cred.passwordHash, oldPassword);
  if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  // set new hash + revoke all refresh tokens for this user (global sign-out)
  const hash = await argon2.hash(newPassword, ARGON2_OPTS);
  await db.transaction(async (tx) => {
    await tx.update(credentialsLocal)
      .set({ passwordHash: hash, passwordAlgo: 'argon2id', passwordUpdatedAt: new Date() })
      .where(eq(credentialsLocal.userId, u.id));

    await tx.update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, u.id));
  });

  // issue fresh access+refresh for this client only
  const refreshPlain = randomBytes(64).toString('base64url');
  const tokenHash = createHash('sha256').update(refreshPlain).digest('hex');
  const ttlMs = Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 2592000) * 1000;
  const expiresAt = new Date(Date.now() + ttlMs);
  await db.insert(refreshTokens).values({ userId: u.id, tokenHash, expiresAt });

  // Reuse your /api/login logic to compute roles if you want; here we skip roles re-fetch for brevity.
  // Better: hit /api/refresh or recompute roles here.
  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res); // clear prior cookies (if any)
  // You already have signAccessJWT utility; import and set cookie if desired
  // setAccessCookie(res, await signAccessJWT(u.id, roleKeys));
  setRefreshCookie(res, refreshPlain);
  return res;
}
