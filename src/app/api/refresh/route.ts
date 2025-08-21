// src\app\api\refresh\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../db/client';
import { refreshTokens } from '../../db/schema/auth/tokens';
import { roles, userRoles } from '../../db/schema/auth/rbac';
import { eq, sql } from 'drizzle-orm';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { signAccessJWT } from '../../lib/jwt';
import { setAccessCookie, setRefreshCookie, clearAuthCookies } from '../../lib/cookies';

export async function POST(req: NextRequest) {
  const refresh = req.cookies.get('refresh_token')?.value;
  if (!refresh) return NextResponse.json({ error: 'No refresh' }, { status: 401 });

  const hash = createHash('sha256').update(refresh).digest('hex');

  const [row] = await db
    .select({
      jti: refreshTokens.jti,
      userId: refreshTokens.userId,
      expiresAt: refreshTokens.expiresAt,
      revokedAt: refreshTokens.revokedAt,
    })
    .from(refreshTokens)
    .where(sql`${refreshTokens.tokenHash} = ${hash} AND ${refreshTokens.revokedAt} IS NULL AND ${refreshTokens.expiresAt} > now()`)
    .limit(1);

  if (!row) {
    const r = NextResponse.json({ error: 'Invalid refresh' }, { status: 401 });
    clearAuthCookies(r);
    return r;
  }

  // rotate
  const newPlain = randomBytes(64).toString('base64url');
  const newHash = createHash('sha256').update(newPlain).digest('hex');
  const newExp = new Date(Date.now() + Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 2592000) * 1000);
  const newJti = randomUUID();

  await db.transaction(async (tx) => {
    await tx.update(refreshTokens).set({ revokedAt: new Date(), replacedByJti: newJti })
      .where(eq(refreshTokens.jti, row.jti));
    await tx.insert(refreshTokens).values({
      jti: newJti, userId: row.userId, tokenHash: newHash, expiresAt: newExp,
    });
  });

  const roleRows = await db
    .select({ key: roles.key })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, row.userId));
  const roleKeys = roleRows.map(r => r.key);

  const access = await signAccessJWT(row.userId, roleKeys);

  const res = NextResponse.json({ ok: true });
  setAccessCookie(res, access);
  setRefreshCookie(res, newPlain);
  return res;
}
