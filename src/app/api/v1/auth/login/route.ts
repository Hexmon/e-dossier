// src/app/api/v1/auth/login/route.ts
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { setAccessCookie } from '@/app/lib/cookies';
import { signAccessJWT } from '@/app/lib/jwt';
import { LoginBody } from './dto';
import { db } from '@/app/db/client';
import { credentialsLocal } from '@/app/db/schema/auth/credentials';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import { getAuthorityForLogin, buildAuthorityRoleKeys } from '@/app/lib/effective-authority';
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
    const missing = [] as string[];
    if (!b.appointmentId && !b.delegationId) {
      missing.push('appointmentId|delegationId');
    }
    if (!b.username || String(b.username).trim() === '') missing.push('username');
    if (!b.password || String(b.password).trim() === '') missing.push('password');

    if (missing.length) {
      await req.audit.log({
        action: AuditEventType.API_REQUEST,
        outcome: 'FAILURE',
        actor: { type: 'anonymous', id: 'unknown' },
        metadata: { reason: 'missing_fields', missing, description: 'Login attempt rejected due to missing fields' },
      });
      throw new ApiError(400, 'Missing required fields', 'missing_fields', {
        missing,
        hint: 'Provide: exactly one of appointmentId or delegationId, plus username and password.',
      });
    }

    // 2) Zod validation (shape/format)
    const parsed = LoginBody.safeParse(b);
    if (!parsed.success) {
      return json.badRequest('Validation failed.', { details: parsed.error.format() });
    }

    const { appointmentId, delegationId, platoonId, username, password } = parsed.data;

    const authority = await getAuthorityForLogin({ appointmentId, delegationId });

    // SECURITY FIX: Check if account is locked before proceeding
    if (authority && authority.userId) {
      const lockout = await isAccountLocked(authority.userId);
      if (lockout) {
        const minutesRemaining = Math.ceil((new Date(lockout.lockedUntil).getTime() - Date.now()) / 60000);

        await recordLoginAttempt({
          userId: authority.userId,
          username: username.toLowerCase(),
          ipAddress: clientIp,
          userAgent: req.headers.get('user-agent') ?? undefined,
          success: false,
          failureReason: 'Account locked',
        });

        await req.audit.log({
          action: AuditEventType.LOGIN_FAILURE,
          outcome: 'DENIED',
          actor: { type: 'user', id: authority.userId },
          target: { type: AuditResourceType.USER, id: authority.userId },
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
    if (authority.scopeType === 'PLATOON') {
      if (!platoonId) throw new ApiError(400, 'platoonId required for platoon-scoped identities', 'PLATOON_REQUIRED');
      if (authority.scopeId !== platoonId) {
        throw new ApiError(403, 'Platoon mismatch for this identity', 'PLATOON_MISMATCH');
      }
    } else if (platoonId) {
      throw new ApiError(400, 'platoonId not allowed for non-platoon identities', 'PLATOON_NOT_ALLOWED');
    }

    if ((authority.username ?? '').toLowerCase() !== username.trim().toLowerCase()) {
      throw new ApiError(403, 'Username does not match the active holder of this appointment', 'USERNAME_MISMATCH');
    }

    const [cred] = await db.select().from(credentialsLocal).where(eq(credentialsLocal.userId, authority.userId)).limit(1);
    if (!cred) {
      await recordLoginAttempt({
        userId: authority.userId,
        username: username.toLowerCase(),
        ipAddress: clientIp,
        userAgent: req.headers.get('user-agent') ?? undefined,
        success: false,
        failureReason: 'No credentials found',
      });

      await checkAndLockAccount(username.toLowerCase(), authority.userId, clientIp);

      await req.audit.log({
        action: AuditEventType.LOGIN_FAILURE,
        outcome: 'FAILURE',
        actor: { type: 'user', id: authority.userId },
        target: { type: AuditResourceType.USER, id: authority.userId },
        metadata: { username: username.toLowerCase(), reason: 'No credentials found' },
      });

      throw new ApiError(401, 'invalid_credentials', 'NO_CREDENTIALS');
    }

    const ok = await argon2.verify(cred.passwordHash, password);
    if (!ok) {
      await recordLoginAttempt({
        userId: authority.userId,
        username: username.toLowerCase(),
        ipAddress: clientIp,
        userAgent: req.headers.get('user-agent') ?? undefined,
        success: false,
        failureReason: 'Invalid password',
      });

      const lockout = await checkAndLockAccount(username.toLowerCase(), authority.userId, clientIp);

      if (lockout) {
        await req.audit.log({
          action: AuditEventType.ACCOUNT_LOCKED,
          outcome: 'DENIED',
          actor: { type: 'system', id: 'system' },
          target: { type: AuditResourceType.USER, id: authority.userId },
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
        actor: { type: 'user', id: authority.userId },
        target: { type: AuditResourceType.USER, id: authority.userId },
        metadata: { username: username.toLowerCase(), reason: 'Invalid password' },
      });

      throw new ApiError(401, 'invalid_credentials', 'BAD_PASSWORD');
    }

    // Record successful login attempt
    await recordLoginAttempt({
      userId: authority.userId,
      username: username.toLowerCase(),
      ipAddress: clientIp,
      userAgent: req.headers.get('user-agent') ?? undefined,
      success: true,
    });

    // Audit log - successful login
    await req.audit.log({
      action: AuditEventType.LOGIN_SUCCESS,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authority.userId },
      target: { type: AuditResourceType.USER, id: authority.userId },
      metadata: {
        username: username.toLowerCase(),
        appointmentId: authority.appointmentId,
        delegationId: authority.delegationId,
        authorityKind: authority.authorityKind,
      },
    });

    const roleKeys = await buildAuthorityRoleKeys(authority);

    const access = await signAccessJWT({
      sub: authority.userId,
      roles: roleKeys,
      apt: {
        id: authority.appointmentId,
        position: authority.positionKey,
        scope: { type: authority.scopeType, id: authority.scopeId ?? null },
        valid_from: authority.startsAt ? new Date(authority.startsAt).toISOString() : null,
        valid_to: authority.endsAt ? new Date(authority.endsAt).toISOString() : null,
        auth_kind: authority.authorityKind,
        delegation_id: authority.delegationId ?? null,
        source_appointment_id: authority.appointmentId,
        grantor_user_id: authority.grantorUserId ?? null,
        grantor_username: authority.grantorUsername ?? null,
      },
      pwd_at: cred.passwordUpdatedAt ? new Date(cred.passwordUpdatedAt).toISOString() : null,
    });

    const csrfToken = IS_DEV ? await generateCsrfToken() : undefined;

    const res = json.ok({
      user: { id: authority.userId, username: authority.username },
      active_appointment: {
        id: authority.appointmentId,
        position: authority.positionKey,
        scope: { type: authority.scopeType, id: authority.scopeId ?? null },
        valid_from: authority.startsAt,
        valid_to: authority.endsAt,
        kind: authority.authorityKind,
        delegationId: authority.delegationId ?? null,
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
