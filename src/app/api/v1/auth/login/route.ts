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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginBody.safeParse(body);
    if (!parsed.success) {
      return json.badRequest('invalid_request', { details: parsed.error.format() });
    }

    const { appointmentId, platoonId, username, password } = parsed.data;

    // 1) Load ACTIVE appointment (+ holder & position key)
    const apt = await getActiveAppointmentWithHolder(appointmentId); // uses valid_during @> now()
    if (!apt) {
      throw new ApiError(400, 'Appointment is not active', 'INVALID_APPOINTMENT');
    }

    // 2) Enforce platoon rules for PLATOON_COMMANDER
    if (apt.positionKey === 'PLATOON_COMMANDER') {
      if (!platoonId) {
        throw new ApiError(400, 'platoonId required for PLATOON_COMMANDER', 'PLATOON_REQUIRED');
      }
      if (!(apt.scopeType === SCOPE.PLATOON && apt.scopeId === platoonId)) {
        throw new ApiError(403, 'Platoon mismatch for this appointment', 'PLATOON_MISMATCH');
      }
    } else if (platoonId) {
      throw new ApiError(400, 'platoonId not allowed for non-platoon appointments', 'PLATOON_NOT_ALLOWED');
    }

    // 3) Username must match the active holder (FE usually pre-fills from apt)
    if ((apt.username ?? '').toLowerCase() !== username.trim().toLowerCase()) {
      throw new ApiError(403, 'Username does not match the active holder of this appointment', 'USERNAME_MISMATCH');
    }

    // 4) Verify password of the holder
    const [cred] = await db
      .select()
      .from(credentialsLocal)
      .where(eq(credentialsLocal.userId, apt.userId))
      .limit(1);

    if (!cred) throw new ApiError(401, 'invalid_credentials', 'NO_CREDENTIALS');
    const ok = await argon2.verify(cred.passwordHash, password);
    if (!ok) throw new ApiError(401, 'invalid_credentials', 'BAD_PASSWORD');

    // 5) Roles (UI hints)
    const roleRows = await db
      .select({ key: roles.key })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, apt.userId));

    const roleKeys = roleRows.map((r) => r.key);

    // 6) Access JWT bound to THIS appointment (no refresh token)
    const access = await signAccessJWT({
      sub: apt.userId,
      roles: roleKeys,
      apt: {
        id: apt.id,
        position: apt.positionKey, // e.g., 'PLATOON_COMMANDER'
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
      // matches ACCESS_TOKEN_TTL_SECONDS used by signAccessJWT
      expires_in: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
    });

    // Only set the access cookie (httpOnly)
    setAccessCookie(res, access);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
