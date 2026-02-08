// src/app/api/v1/auth/login/route.ts
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { setAccessCookie } from '@/app/lib/cookies';
import { signAccessJWT } from '@/app/lib/jwt';
import { LoginBody } from './dto';
import { db } from '@/app/db/client';
import { credentialsLocal } from '@/app/db/schema/auth/credentials';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import { getActiveAppointmentWithHolder } from '@/app/db/queries/appointments';
import { SCOPE } from '@/constants/app.constants';
import { getClientIp, checkLoginRateLimit, getRateLimitHeaders } from '@/lib/ratelimit';
import {
  recordLoginAttempt,
  isAccountLocked,
  checkAndLockAccount,
} from '@/app/db/queries/account-lockout';
import {
  withAuditRoute,
  AuditEventType,
  AuditResourceType,
} from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { generateCsrfToken, setCsrfCookie } from '@/lib/csrf';

const IS_DEV = process.env.NODE_ENV === 'development' || process.env.EXPOSE_TOKENS_IN_DEV === 'true';

async function POSTHandler(req: AuditNextRequest) {
  try {
    // SECURITY FIX: Rate limiting for login attempts (5 per 15 minutes)
    const clientIp = getClientIp(req);

    const rateLimitResult = await checkLoginRateLimit(clientIp);

    if (!rateLimitResult.success) {
      const headers = getRateLimitHeaders(rateLimitResult);
      return new Response(
        JSON.stringify({
          status: 429,
          ok: false,
          error: 'too_many_requests',
          message: 'Too many login attempts. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
            'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // 0) Parse JSON safely
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      await req.audit.log({
        action: AuditEventType.API_REQUEST,
        outcome: 'FAILURE',
        actor: { type: 'anonymous', id: 'unknown' },
        metadata: { reason: 'invalid_json', description: 'Login attempt rejected due to invalid JSON body' },
      });
      throw new ApiError(400, 'Request body must be valid JSON', 'invalid_json', {
        message: 'Request body must be valid JSON.',
      });
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
      await req.audit.log({
        action: AuditEventType.API_REQUEST,
        outcome: 'FAILURE',
        actor: { type: 'anonymous', id: 'unknown' },
        metadata: { reason: 'missing_fields', missing, description: 'Login attempt rejected due to missing fields' },
      });
      throw new ApiError(400, 'Missing required fields', 'missing_fields', {
        missing,
        hint: 'Provide: appointmentId (uuid), username (non-empty), password (min 8 chars).',
      });
    }

    // 2) Zod validation (shape/format)
    const parsed = LoginBody.safeParse(b);
    if (!parsed.success) {
      return json.badRequest('Validation failed.', { details: parsed.error.format() });
    }

    const { appointmentId, platoonId, username, password } = parsed.data;

    // SECURITY FIX: Check if account is locked before proceeding
    const apt = await getActiveAppointmentWithHolder(appointmentId);

    if (apt && apt.userId) {
      const lockout = await isAccountLocked(apt.userId);
      if (lockout) {
        const minutesRemaining = Math.ceil((new Date(lockout.lockedUntil).getTime() - Date.now()) / 60000);

        await recordLoginAttempt({
          userId: apt.userId,
          username: username.toLowerCase(),
          ipAddress: clientIp,
          userAgent: req.headers.get('user-agent') ?? undefined,
          success: false,
          failureReason: 'Account locked',
        });

        await req.audit.log({
          action: AuditEventType.LOGIN_FAILURE,
          outcome: 'DENIED',
          actor: { type: 'user', id: apt.userId },
          target: { type: AuditResourceType.USER, id: apt.userId },
          metadata: { username: username.toLowerCase(), reason: 'Account locked' },
        });

        throw new ApiError(
          403,
          `Account is temporarily locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minutes.`,
          'ACCOUNT_LOCKED'
        );
      }
    }

    // 3) Domain checks & auth

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

    const [cred] = await db.select().from(credentialsLocal).where(eq(credentialsLocal.userId, apt.userId)).limit(1);
    if (!cred) {
      await recordLoginAttempt({
        userId: apt.userId,
        username: username.toLowerCase(),
        ipAddress: clientIp,
        userAgent: req.headers.get('user-agent') ?? undefined,
        success: false,
        failureReason: 'No credentials found',
      });

      await checkAndLockAccount(username.toLowerCase(), apt.userId, clientIp);

      await req.audit.log({
        action: AuditEventType.LOGIN_FAILURE,
        outcome: 'FAILURE',
        actor: { type: 'user', id: apt.userId },
        target: { type: AuditResourceType.USER, id: apt.userId },
        metadata: { username: username.toLowerCase(), reason: 'No credentials found' },
      });

      throw new ApiError(401, 'invalid_credentials', 'NO_CREDENTIALS');
    }

    const ok = await argon2.verify(cred.passwordHash, password);
    if (!ok) {
      await recordLoginAttempt({
        userId: apt.userId,
        username: username.toLowerCase(),
        ipAddress: clientIp,
        userAgent: req.headers.get('user-agent') ?? undefined,
        success: false,
        failureReason: 'Invalid password',
      });

      const lockout = await checkAndLockAccount(username.toLowerCase(), apt.userId, clientIp);

      if (lockout) {
        await req.audit.log({
          action: AuditEventType.ACCOUNT_LOCKED,
          outcome: 'DENIED',
          actor: { type: 'system', id: 'system' },
          target: { type: AuditResourceType.USER, id: apt.userId },
          metadata: {
            username: username.toLowerCase(),
            failedAttempts: lockout.failedAttempts,
            lockedUntil: new Date(lockout.lockedUntil).toISOString(),
          },
        });

        const minutesRemaining = Math.ceil((new Date(lockout.lockedUntil).getTime() - Date.now()) / 60000);
        throw new ApiError(
          403,
          `Account has been locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minutes.`,
          'ACCOUNT_LOCKED'
        );
      }

      await req.audit.log({
        action: AuditEventType.LOGIN_FAILURE,
        outcome: 'FAILURE',
        actor: { type: 'user', id: apt.userId },
        target: { type: AuditResourceType.USER, id: apt.userId },
        metadata: { username: username.toLowerCase(), reason: 'Invalid password' },
      });

      throw new ApiError(401, 'invalid_credentials', 'BAD_PASSWORD');
    }

    // Record successful login attempt
    await recordLoginAttempt({
      userId: apt.userId,
      username: username.toLowerCase(),
      ipAddress: clientIp,
      userAgent: req.headers.get('user-agent') ?? undefined,
      success: true,
    });

    // Audit log - successful login
    await req.audit.log({
      action: AuditEventType.LOGIN_SUCCESS,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: apt.userId },
      target: { type: AuditResourceType.USER, id: apt.userId },
      metadata: { username: username.toLowerCase(), appointmentId: apt.id },
    });

    const roleKeys = [apt.positionKey];

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

    const csrfToken = IS_DEV ? await generateCsrfToken() : undefined;

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
      expires_in: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
      ...(IS_DEV ? { access_token: access, csrf_token: csrfToken } : {}),
    });
    setAccessCookie(res, access);
    if (csrfToken) setCsrfCookie(res, csrfToken);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
export const POST = withAuditRoute('POST', POSTHandler);
