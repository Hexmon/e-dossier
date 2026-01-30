// src\app\api\v1\auth\signup\route.ts
import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { signupSchema } from '@/app/lib/validators';
import { signupLocal } from '@/app/db/queries/auth';
import { createSignupRequest } from '@/app/db/queries/signupRequests';
import { preflightConflicts } from '@/utils/preflightConflicts';
import { getClientIp, checkSignupRateLimit, getRateLimitHeaders } from '@/lib/ratelimit';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

type PgError = { code?: string; detail?: string };

async function POSTHandler(req: NextRequest) {
  try {
    // SECURITY FIX: Rate limiting for signup attempts (3 per hour)
    const clientIp = getClientIp(req);
    const rateLimitResult = await checkSignupRateLimit(clientIp);

    if (!rateLimitResult.success) {
      const headers = getRateLimitHeaders(rateLimitResult as any);
      await createAuditLog({
        actorUserId: null,
        eventType: AuditEventType.API_REQUEST,
        resourceType: AuditResourceType.API,
        resourceId: null,
        description: 'Signup attempt blocked by rate limit',
        metadata: { reason: 'rate_limited', clientIp },
        request: req,
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
      await createAuditLog({
        actorUserId: null,
        eventType: AuditEventType.API_REQUEST,
        resourceType: AuditResourceType.API,
        resourceId: null,
        description: 'Signup attempt rejected due to validation errors',
        metadata: { reason: 'validation_failed' },
        request: req,
      });
      return json.badRequest('Validation failed', { issues: parsed.error.flatten() });
    }

    const { username, name, email, phone, rank, password, note } = parsed?.data ?? {};

    const conflicts = await preflightConflicts(username, email, phone);
    if (conflicts.length) {
      await createAuditLog({
        actorUserId: null,
        eventType: AuditEventType.API_REQUEST,
        resourceType: AuditResourceType.API,
        resourceId: null,
        description: 'Signup attempt blocked by conflicts',
        metadata: { reason: 'conflict', conflicts },
        request: req,
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

    await createAuditLog({
      actorUserId: userId,
      eventType: AuditEventType.SIGNUP_REQUEST_CREATED,
      resourceType: AuditResourceType.SIGNUP_REQUEST,
      resourceId: userId,
      description: 'Signup request submitted',
      metadata: {
        username,
        email,
        phone,
      },
      request: req,
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
export const POST = withRouteLogging('POST', POSTHandler);
