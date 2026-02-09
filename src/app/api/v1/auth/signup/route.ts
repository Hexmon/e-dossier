// src\app\api\v1\auth\signup\route.ts
import { json, handleApiError } from '@/app/lib/http';
import { signupSchema } from '@/app/lib/validators';
import { signupLocal } from '@/app/db/queries/auth';
import { createSignupRequest } from '@/app/db/queries/signupRequests';
import { preflightConflicts } from '@/utils/preflightConflicts';
import { getClientIp, checkSignupRateLimit, getRateLimitHeaders } from '@/lib/ratelimit';
import {
  withAuditRoute,
  AuditEventType,
  AuditResourceType,
} from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

type PgError = { code?: string; detail?: string };

async function POSTHandler(req: AuditNextRequest) {
  try {
    // SECURITY FIX: Rate limiting for signup attempts (3 per hour)
    const clientIp = getClientIp(req);
    const rateLimitResult = await checkSignupRateLimit(clientIp);

    if (!rateLimitResult.success) {
      const headers = getRateLimitHeaders(rateLimitResult as any);
      await req.audit.log({
        action: AuditEventType.API_REQUEST,
        outcome: 'FAILURE',
        actor: { type: 'anonymous', id: 'unknown' },
        target: { type: AuditResourceType.API, id: undefined },
        metadata: { reason: 'rate_limited', clientIp, description: 'Signup attempt blocked by rate limit' },
      });
      return new Response(
        JSON.stringify({
          status: 429,
          ok: false,
          error: 'too_many_requests',
          message: 'Too many signup attempts. Please try again later.',
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

    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      await req.audit.log({
        action: AuditEventType.API_REQUEST,
        outcome: 'FAILURE',
        actor: { type: 'anonymous', id: 'unknown' },
        target: { type: AuditResourceType.API, id: undefined },
        metadata: { reason: 'validation_failed', description: 'Signup attempt rejected due to validation errors' },
      });
      return json.badRequest('Validation failed', { issues: parsed.error.flatten() });
    }

    const { username, name, email, phone, rank, password, note } = parsed?.data ?? {};

    const conflicts = await preflightConflicts(username, email, phone);
    if (conflicts.length) {
      await req.audit.log({
        action: AuditEventType.API_REQUEST,
        outcome: 'FAILURE',
        actor: { type: 'anonymous', id: 'unknown' },
        target: { type: AuditResourceType.API, id: undefined },
        metadata: { reason: 'conflict', conflicts, description: 'Signup attempt blocked by conflicts' },
      });
      return json.badRequest('Already in use', { conflicts });
    }

    // 1) Create disabled user
    const { id: userId, username: uname } = await signupLocal({
      username, password, name, email, phone, rank, isActive: false,
    });

    // 2) Default role (guest) if present
    // const [defaultRole] = await db.select().from(roles).where(inArray(roles.key, ['GUEST', 'guest'])).limit(1);
    // if (defaultRole) {
    //   await db.insert(userRoles).values({ userId, roleId: defaultRole.id }).onConflictDoNothing();
    // }

    // 3) Create a simple signup_request (no desired position/scope)
    await createSignupRequest({
      userId,
      // desiredPositionId: null,
      // desiredScopeType: 'GLOBAL',
      // desiredScopeId: null,
      note: note ?? null,
      payload: { username, name, email, phone, rank, note },
    });

    await req.audit.log({
      action: AuditEventType.SIGNUP_REQUEST_CREATED,
      outcome: 'SUCCESS',
      actor: { type: 'anonymous', id: 'unknown' },
      target: { type: AuditResourceType.SIGNUP_REQUEST, id: userId },
      metadata: {
        username,
        email,
        phone,
        description: 'Signup request submitted',
      },
    });

    return json.created({
      message: 'Signup received. An admin will review your request.',
      user: { id: userId, username: uname, isActive: false },
    });
  } catch (err) {
    const e = err as PgError;
    if (e?.code === '23505') return json.badRequest('Username / email / phone already in use');
    return handleApiError(err);
  }
}
export const POST = withAuditRoute('POST', POSTHandler);
