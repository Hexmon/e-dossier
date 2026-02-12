import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthorizationEngine, Decision, Principal } from '@hexmon_tech/acccess-control-core';
import { ApiError } from '@/app/lib/http';
import { withAuthz } from '@/app/lib/acx/withAuthz';

type MockAuditLog = ReturnType<typeof vi.fn>;

function makeDecision(allow: boolean): Decision {
  return {
    allow,
    reasons: allow
      ? [{ code: 'ALLOW', message: 'Allowed by test policy' }]
      : [{ code: 'DENY', message: 'Denied by test policy' }],
    obligations: [],
    meta: {
      traceId: 'trace-test-1',
      engine: 'test-engine',
      evaluatedAt: new Date().toISOString(),
    },
  };
}

function makeEngine(decision: Decision): AuthorizationEngine {
  return {
    engine: 'test-engine',
    authorize: vi.fn(async () => decision),
    batchAuthorize: vi.fn(async () => [decision]),
  };
}

function makePrincipal(): Principal {
  return {
    id: 'user-1',
    type: 'user',
    tenantId: 'GLOBAL',
    roles: ['HOAT'],
    attrs: {
      permissions: ['me:read'],
    },
  };
}

function makeRequest(url: string, method = 'GET', auditLog?: MockAuditLog): Request {
  const req = new Request(url, { method }) as Request & { audit?: { log: MockAuditLog } };
  if (auditLog) {
    req.audit = { log: auditLog };
  }
  return req;
}

describe('withAuthz', () => {
  const previousAuthzFlag = process.env.AUTHZ_V2_ENABLED;

  beforeEach(() => {
    process.env.AUTHZ_V2_ENABLED = 'true';
  });

  afterEach(() => {
    process.env.AUTHZ_V2_ENABLED = previousAuthzFlag;
  });

  it('passes through when feature flag is disabled', async () => {
    process.env.AUTHZ_V2_ENABLED = 'false';
    const decision = makeDecision(true);
    const engine = makeEngine(decision);
    const handler = vi.fn(async () => new Response(null, { status: 204 }));

    const wrapped = withAuthz(handler as any, {
      engine,
      getPrincipal: async () => makePrincipal(),
    });

    const response = await wrapped(makeRequest('http://localhost/api/v1/unmapped') as any, { params: Promise.resolve({}) });

    expect(response.status).toBe(204);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(engine.authorize).not.toHaveBeenCalled();
  });

  it('returns 400 when no action mapping exists', async () => {
    const decision = makeDecision(true);
    const engine = makeEngine(decision);
    const handler = vi.fn(async () => new Response(null, { status: 200 }));

    const wrapped = withAuthz(handler as any, {
      engine,
      getPrincipal: async () => makePrincipal(),
    });

    const response = await wrapped(makeRequest('http://localhost/api/v1/unmapped') as any, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('bad_request');
    expect(handler).not.toHaveBeenCalled();
    expect(engine.authorize).not.toHaveBeenCalled();
  });

  it('returns 401 when principal extraction fails with unauthorized', async () => {
    const decision = makeDecision(true);
    const engine = makeEngine(decision);
    const handler = vi.fn(async () => new Response(null, { status: 200 }));

    const wrapped = withAuthz(handler as any, {
      engine,
      getPrincipal: async () => {
        throw new ApiError(401, 'Unauthorized', 'unauthorized');
      },
    });

    const response = await wrapped(makeRequest('http://localhost/api/v1/me') as any, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('unauthorized');
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 403 and emits deny audit when decision is denied', async () => {
    const denyDecision = makeDecision(false);
    const engine = makeEngine(denyDecision);
    const handler = vi.fn(async () => new Response(null, { status: 200 }));
    const auditLog = vi.fn(async () => undefined);

    const wrapped = withAuthz(handler as any, {
      engine,
      getPrincipal: async () => makePrincipal(),
    });

    const response = await wrapped(makeRequest('http://localhost/api/v1/me', 'GET', auditLog) as any, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('forbidden');
    expect(handler).not.toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledTimes(1);

    const loggedEvent = auditLog.mock.calls[0][0];
    expect(loggedEvent.outcome).toBe('FAILURE');
    expect(loggedEvent.metadata.authz.allow).toBe(false);
  });

  it('calls wrapped handler and emits allow audit when decision is allowed', async () => {
    const allowDecision = makeDecision(true);
    const engine = makeEngine(allowDecision);
    const handler = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const auditLog = vi.fn(async () => undefined);

    const wrapped = withAuthz(handler as any, {
      engine,
      getPrincipal: async () => makePrincipal(),
    });

    const response = await wrapped(makeRequest('http://localhost/api/v1/me', 'GET', auditLog) as any, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(auditLog).toHaveBeenCalledTimes(1);

    const loggedEvent = auditLog.mock.calls[0][0];
    expect(loggedEvent.outcome).toBe('SUCCESS');
    expect(loggedEvent.metadata.authz.allow).toBe(true);
  });
});

