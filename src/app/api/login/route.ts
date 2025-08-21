// src\app\api\login\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '../../db/queries/auth';
import { db } from '../../db/client';
import { refreshTokens } from '../../db/schema/auth/tokens';
import { roles, userRoles } from '../../db/schema/auth/rbac';
import { eq } from 'drizzle-orm';
import { randomBytes, createHash } from 'crypto';
import { signAccessJWT } from '../../lib/jwt';
import { setAccessCookie, setRefreshCookie } from '../../lib/cookies';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const user = await verifyPassword(username, password);
  if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const roleRows = await db
    .select({ key: roles.key })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, user.id));
  const roleKeys = roleRows.map(r => r.key);

  const access = await signAccessJWT(user.id, roleKeys);

  // opaque refresh token, store hash
  const refreshPlain = randomBytes(64).toString('base64url');
  const tokenHash = createHash('sha256').update(refreshPlain).digest('hex');
  const expiresAt = new Date(Date.now() + Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 2592000) * 1000);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  const res = NextResponse.json({ user: { id: user.id, username: user.username, roles: roleKeys } });
  setAccessCookie(res, access);
  setRefreshCookie(res, refreshPlain);
  return res;
}
