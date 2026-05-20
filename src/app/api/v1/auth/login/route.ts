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
import { checkLoginRateLimit, getClientIp } from '@/lib/ratelimit';
import {
  checkAndLockAccount,
  clearFailedAttempts,
  isAccountLocked,
  recordLoginAttempt,
} from '@/app/db/queries/account-lockout';
import { assertLoginAllowedDuringSetup } from '@/app/lib/setup-gate';
import {
  withAuditRoute,
  AuditEventType,
  AuditResourceType,
} from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { generateCsrfToken, setCsrfCookie } from '@/lib/csrf';
import { deriveSidebarRoleGroup } from '@/lib/sidebar-visibility';

const IS_DEV = process.env.NODE_ENV === 'development' || process.env.EXPOSE_TOKENS_IN_DEV === 'true';

async function POSTHandler(req: AuditNextRequest) {
  try {
    const clientIp = getClientIp(req);

    const rateLimitResult = await checkLoginRateLimit(clientIp);
    if (!rateLimitResult.success) {
      throw new ApiError(
        429,
        'Too many login attempts. Please try again later.',
        'rate_limited',
        {
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
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
        hint: 'Provide: exactly one of appointmentId or delegationId, plus password.',
      });
    }

    // 2) Zod validation (shape/format)
    const parsed = LoginBody.safeParse(b);
    if (!parsed.success) {
      return json.badRequest('Validation failed.', { details: parsed.error.format() });
    }

    const { appointmentId, delegationId, password } = parsed.data;

    const authority = await getAuthorityForLogin({ appointmentId, delegationId });
    const loginUsername = authority.username.toLowerCase();
    const loginRoleGroup = deriveSidebarRoleGroup({
      roles: [authority.positionKey],
      position: authority.positionKey,
    });
    await assertLoginAllowedDuringSetup(loginRoleGroup);

    const activeLockout = await isAccountLocked(authority.userId);
    if (activeLockout) {
      throw new ApiError(
        423,
        'Account is temporarily locked due to multiple failed login attempts.',
        'ACCOUNT_LOCKED',
        {
          lockedUntil: activeLockout.lockedUntil,
          failedAttempts: activeLockout.failedAttempts,
        }
      );
    }

    const [cred] = await db.select().from(credentialsLocal).where(eq(credentialsLocal.userId, authority.userId)).limit(1);
    if (!cred) {
      await recordLoginAttempt({
        userId: authority.userId,
        username: loginUsername,
        ipAddress: clientIp,
        userAgent: req.headers.get('user-agent') ?? undefined,
        success: false,
        failureReason: 'No credentials found',
      });

      await req.audit.log({
        action: AuditEventType.LOGIN_FAILURE,
        outcome: 'FAILURE',
        actor: { type: 'user', id: authority.userId },
        target: { type: AuditResourceType.USER, id: authority.userId },
        metadata: { username: loginUsername, reason: 'No credentials found' },
      });

      throw new ApiError(401, 'invalid_credentials', 'NO_CREDENTIALS');
    }

    const ok = await argon2.verify(cred.passwordHash, password);
    if (!ok) {
      await recordLoginAttempt({
        userId: authority.userId,
        username: loginUsername,
        ipAddress: clientIp,
        userAgent: req.headers.get('user-agent') ?? undefined,
        success: false,
        failureReason: 'Invalid password',
      });

      await req.audit.log({
        action: AuditEventType.LOGIN_FAILURE,
        outcome: 'FAILURE',
        actor: { type: 'user', id: authority.userId },
        target: { type: AuditResourceType.USER, id: authority.userId },
        metadata: { username: loginUsername, reason: 'Invalid password' },
      });

      const lockout = await checkAndLockAccount(
        loginUsername,
        authority.userId,
        clientIp
      );

      if (lockout) {
        throw new ApiError(
          423,
          'Account is temporarily locked due to multiple failed login attempts.',
          'ACCOUNT_LOCKED',
          {
            lockedUntil: lockout.lockedUntil,
            failedAttempts: lockout.failedAttempts,
          }
        );
      }

      throw new ApiError(401, 'invalid_credentials', 'BAD_PASSWORD');
    }

    // Record successful login attempt
    await recordLoginAttempt({
      userId: authority.userId,
      username: loginUsername,
      ipAddress: clientIp,
      userAgent: req.headers.get('user-agent') ?? undefined,
      success: true,
    });

    await clearFailedAttempts(loginUsername);

    // Audit log - successful login
    await req.audit.log({
      action: AuditEventType.LOGIN_SUCCESS,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authority.userId },
      target: { type: AuditResourceType.USER, id: authority.userId },
      metadata: {
        username: loginUsername,
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
