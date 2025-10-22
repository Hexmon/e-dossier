// src/app/api/v1/auth/login/route.ts
import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { setAccessCookie } from '@/app/lib/cookies';
import { signAccessJWT } from '@/app/lib/jwt';
import { LoginBody } from './dto';
import { db } from '@/app/db/client';
import { roles, userRoles } from '@/app/db/schema/auth/rbac';
import { credentialsLocal } from '@/app/db/schema/auth/credentials';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import { getActiveAppointmentWithHolder } from '@/app/db/queries/appointments';
import { SCOPE } from '@/constants/app.constants';
import { users } from '@/app/db/schema/auth/users';

const IS_DEV = process.env.NODE_ENV === 'development' || process.env.EXPOSE_TOKENS_IN_DEV === 'true';

export async function POST(req: NextRequest) {
  try {
    // 0) Parse JSON safely
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json.badRequest('invalid_json', { message: 'Request body must be valid JSON.' });
    }

    // 1) Explicit missing-field check (before Zod)
    const b = (body ?? {}) as Record<string, unknown>;
    const requiredFields = ['appointmentId', 'username', 'password'] as const;

    const missing = requiredFields.filter((k) => {
      const v = b[k];
      if (v === null || v === undefined) return true;
      if (k === 'username' && String(v).trim() === '') return true;
      if (k === 'password' && String(v).trim() === '') return true;
      return false;
    });

    if (missing.length) {
      return json.badRequest('missing_fields', {
        missing,
        hint: 'Provide: appointmentId (uuid), username (non-empty), password (min 8 chars).',
      });
    }

    // 2) Zod validation (shape/format)
    const parsed = LoginBody.safeParse(b);
    if (!parsed.success) {
      return json.badRequest('invalid_request', { details: parsed.error.format() });
    }

    const { appointmentId, platoonId, username, password } = parsed.data;

    // 3) Domain checks & auth
    const apt = await getActiveAppointmentWithHolder(appointmentId);
    
    if (!apt) throw new ApiError(400, 'Appointment is not active', 'INVALID_APPOINTMENT');

    if (apt.positionKey === 'PLATOON_COMMANDER') {
      if (!platoonId) throw new ApiError(400, 'platoonId required for PLATOON_COMMANDER', 'PLATOON_REQUIRED');
      if (!(apt.scopeType === SCOPE.PLATOON && apt.scopeId === platoonId)) {
        throw new ApiError(403, 'Platoon mismatch for this appointment', 'PLATOON_MISMATCH');
      }
    } else if (platoonId) {
      throw new ApiError(400, 'platoonId not allowed for non-platoon appointments', 'PLATOON_NOT_ALLOWED');
    }

    if ((apt.username ?? '').toLowerCase() !== username.trim().toLowerCase()) {
      throw new ApiError(403, 'Username does not match the active holder of this appointment', 'USERNAME_MISMATCH');
    }

    // const [u] = await db
    //   .select({
    //     id: users.id,
    //     isActive: users.isActive,
    //     deletedAt: users.deletedAt,
    //     deactivatedAt: users.deactivatedAt,
    //   })
    //   .from(users)
    //   .where(eq(users.id, apt.userId))
    //   .limit(1);

    // if (!u) throw new ApiError(401, 'Unauthorized', 'unauthorized');

    // if (!u.isActive || u.deletedAt) {
    //   // Consistent error envelope with your helpers
    //   throw new ApiError(
    //     403,
    //     'Account is deactivated. Please contact administrator.',
    //     'user_inactive_or_deleted'
    //   );
    // }

    const [cred] = await db.select().from(credentialsLocal).where(eq(credentialsLocal.userId, apt.userId)).limit(1);
    if (!cred) throw new ApiError(401, 'invalid_credentials', 'NO_CREDENTIALS');

    const ok = await argon2.verify(cred.passwordHash, password);
    if (!ok) throw new ApiError(401, 'invalid_credentials', 'BAD_PASSWORD');

    const roleRows = await db
      .select({ key: roles.key })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, apt.userId));
    const roleKeys = roleRows.map((r) => r.key);

    const access = await signAccessJWT({
      sub: apt.userId,
      roles: roleKeys,
      apt: {
        id: apt.id,
        position: apt.positionKey,
        scope: { type: apt.scopeType, id: apt.scopeId ?? null },
        valid_from: apt.startsAt ? new Date(apt.startsAt).toISOString() : null,
        valid_to: apt.endsAt ? new Date(apt.endsAt).toISOString() : null,
      },
      pwd_at: cred.passwordUpdatedAt ? new Date(cred.passwordUpdatedAt).toISOString() : null,
    });

    const res = json.ok({
      user: { id: apt.userId, username: apt.username },
      active_appointment: {
        id: apt.id,
        position: apt.positionKey,
        scope: { type: apt.scopeType, id: apt.scopeId ?? null },
        valid_from: apt.startsAt,
        valid_to: apt.endsAt,
      },
      roles: roleKeys,
      token_type: 'Bearer',
      // keep a sane default (15m) unless you really want a huge TTL
      expires_in: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
      ...(IS_DEV ? { access_token: access } : {}),
    });
    setAccessCookie(res, access);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
