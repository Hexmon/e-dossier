// src\app\api\signup\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { signupSchema } from '../../lib/validators';
import { signupLocal } from '../../db/queries/auth';
import { db } from '../../db/client';
import { roles, userRoles } from '../../db/schema/auth/rbac';
import { eq } from 'drizzle-orm';

// reuse your existing helpers for immediate sign-in (optional)
import { signAccessJWT } from '../../lib/jwt';
import { setAccessCookie, setRefreshCookie } from '../../lib/cookies';
import { refreshTokens } from '../../db/schema/auth/tokens';
import { randomBytes, createHash } from 'crypto';

type PgError = { code?: string; detail?: string };

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = signupSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { username, name, email, phone, usertype, rank, password } = parsed.data;

  try {
    // 1) Create the user + credentials atomically (your existing function)
    const { id } = await signupLocal({
      username, password, name, email, phone, usertype, rank,
    });

    // 2) (Optional) Put new users in a default role, e.g. 'guest'
    //    Comment this block if you want admin to assign roles later.
    const [guest] = await db.select().from(roles).where(eq(roles.key, 'guest')).limit(1);
    if (guest) {
      await db.insert(userRoles).values({ userId: id, roleId: guest.id }).onConflictDoNothing();
    }

    // 3) (Optional) Auto-login after signup: mint access JWT + refresh cookie
    const roleKeys = guest ? ['guest'] : [];
    const access = await signAccessJWT(id, roleKeys);

    const refreshPlain = randomBytes(64).toString('base64url');
    const tokenHash = createHash('sha256').update(refreshPlain).digest('hex');
    const refreshTtl = Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 2592000) * 1000;
    const expiresAt = new Date(Date.now() + refreshTtl);

    await db.insert(refreshTokens).values({ userId: id, tokenHash, expiresAt });

    const res = NextResponse.json({
      user: { id, username, roles: roleKeys },
      message: 'Signup successful',
    });
    setAccessCookie(res, access);
    setRefreshCookie(res, refreshPlain);
    return res;
  } catch (err: unknown) {
    const e = err as PgError;
    // unique violation (username/email/phone) from your partial-unique indexes
    if (e.code === '23505') {
      return NextResponse.json(
        { error: 'Username / email / phone already in use' },
        { status: 409 }
      );
    }
    // generic
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
