// src\app\api\logout\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../db/client';
import { refreshTokens } from '../../db/schema/auth/tokens';
import { createHash } from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { clearAuthCookies } from '../../lib/cookies';

export async function POST(req: NextRequest) {
  const refresh = req.cookies.get('refresh_token')?.value;
  if (refresh) {
    const hash = createHash('sha256').update(refresh).digest('hex');
    await db.update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(sql`${refreshTokens.tokenHash} = ${hash} AND ${refreshTokens.revokedAt} IS NULL`);
  }
  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res);
  return res;
}
