import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/app/lib/http';
import { createRouteContext, makeJsonRequest } from '../utils/next';

vi.mock('@/app/api/v1/oc/_checks', () => ({
  mustBeAuthed: vi.fn(),
}));

vi.mock('@/app/services/oc-academics', () => ({
  getOcAcademicSemester: vi.fn(),
  getOcAcademics: vi.fn(),
  updateOcAcademicSubject: vi.fn(),
  deleteOcAcademicSubject: vi.fn(),
}));

vi.mock('@/app/lib/acx/engine', () => ({
  getAuthzEngine: vi.fn(),
}));

vi.mock('@/app/lib/acx/principal', () => ({
  buildPrincipalFromRequest: vi.fn(),
}));

import { mustBeAuthed } from '@/app/api/v1/oc/_checks';
import { getOcAcademicSemester, updateOcAcademicSubject } from '@/app/services/oc-academics';
import { getAuthzEngine } from '@/app/lib/acx/engine';
import { buildPrincipalFromRequest } from '@/app/lib/acx/principal';
import { GET, POST } from '@/app/api/v1/oc/academics/bulk/route';

function attachAudit(req: any) {
  req.audit = { log: vi.fn(async () => undefined) };
  return req;
}

function makeDecision(allow: boolean) {
  return {
    allow,
    reasons: [{ code: allow ? 'ALLOW' : 'DENY', message: allow ? 'allowed' : 'denied' }],
    obligations: [],
    meta: {
      traceId: 'trace-1',
      engine: 'test-engine',
      evaluatedAt: new Date().toISOString(),
    },
  };
}

describe('OC academics bulk API', () => {
  const originalAuthzFlag = process.env.AUTHZ_V2_ENABLED;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTHZ_V2_ENABLED = 'false';
    (mustBeAuthed as any).mockResolvedValue({ userId: 'u-1', roles: ['HOAT'] });
    (getOcAcademicSemester as any).mockResolvedValue({
      semester: 1,
      subjects: [
        {
          subject: { id: 'subject-1', code: 'SUB-1' },
          theory: { phaseTest1Marks: 10 },
          practical: { finalMarks: 15 },
        },
      ],
    });
    (buildPrincipalFromRequest as any).mockResolvedValue({
      id: 'u-1',
      type: 'user',
      tenantId: 'GLOBAL',
      roles: ['HOAT'],
      attrs: { permissions: [] },
    });
    (getAuthzEngine as any).mockReturnValue({
      engine: 'test-engine',
      authorize: vi.fn(async () => makeDecision(true)),
      batchAuthorize: vi.fn(async () => [makeDecision(true)]),
    });
  });

  afterEach(() => {
    process.env.AUTHZ_V2_ENABLED = originalAuthzFlag;
  });

  it('allows authenticated non-admin users to read bulk academics', async () => {
    const req = attachAudit(
      makeJsonRequest({
        method: 'GET',
        path: '/api/v1/oc/academics/bulk?ocIds=oc-1&semester=1&subjectIds=subject-1',
      }),
    );

    const res = await GET(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.items[0].status).toBe('ok');
    expect(mustBeAuthed).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when authentication fails', async () => {
    (mustBeAuthed as any).mockRejectedValueOnce(new ApiError(401, 'Unauthorized', 'unauthorized'));

    const req = attachAudit(
      makeJsonRequest({
        method: 'GET',
        path: '/api/v1/oc/academics/bulk?ocIds=oc-1&semester=1',
      }),
    );

    const res = await GET(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('unauthorized');
  });

  it('returns 403 when authz denies the bulk-read action', async () => {
    process.env.AUTHZ_V2_ENABLED = 'true';
    (getAuthzEngine as any).mockReturnValue({
      engine: 'test-engine',
      authorize: vi.fn(async () => makeDecision(false)),
      batchAuthorize: vi.fn(async () => [makeDecision(false)]),
    });

    const req = attachAudit(
      makeJsonRequest({
        method: 'GET',
        path: '/api/v1/oc/academics/bulk?ocIds=oc-1&semester=1',
      }),
    );

    const res = await GET(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('forbidden');
    expect(mustBeAuthed).not.toHaveBeenCalled();
  });

  it('saves structured practical component marks through bulk academics', async () => {
    (updateOcAcademicSubject as any).mockResolvedValueOnce({
      semester: 1,
      subjects: [],
    });

    const req = attachAudit(
      makeJsonRequest({
        method: 'POST',
        path: '/api/v1/oc/academics/bulk',
        body: {
          items: [
            {
              op: 'upsert',
              ocId: '11111111-1111-4111-8111-111111111111',
              semester: 1,
              subjectId: '22222222-2222-4222-8222-222222222222',
              practical: {
                conductOfExp: 18,
                maintOfApp: 17,
                practicalTest: 39,
                vivaVoce: 12,
                finalMarks: 86,
              },
            },
          ],
          failFast: true,
        },
      }),
    );

    const res = await POST(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(updateOcAcademicSubject).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      1,
      '22222222-2222-4222-8222-222222222222',
      {
        theory: undefined,
        practical: {
          conductOfExp: 18,
          maintOfApp: 17,
          practicalTest: 39,
          vivaVoce: 12,
          finalMarks: 86,
        },
      },
      expect.objectContaining({
        actorUserId: 'u-1',
      }),
    );
  });
});
