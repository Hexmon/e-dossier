import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '@/app/api/v1/oc/[ocId]/spr/route';
import { makeJsonRequest } from '../utils/next';
import { ApiError } from '@/app/lib/http';
import * as ocChecks from '@/app/api/v1/oc/_checks';
import * as authz from '@/lib/authorization';
import * as service from '@/app/services/oc-performance-records';

vi.mock('@/app/api/v1/oc/_checks', () => ({
  parseParam: vi.fn(),
  ensureOcExists: vi.fn(),
  mustBeAuthed: vi.fn(),
  assertOcSemesterWriteAllowed: vi.fn(),
}));

vi.mock('@/lib/authorization', () => ({
  authorizeOcAccess: vi.fn(),
}));

vi.mock('@/app/services/oc-performance-records', () => ({
  getSprView: vi.fn(),
  upsertSprView: vi.fn(),
}));

const ocId = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  vi.clearAllMocks();
  (ocChecks.parseParam as any).mockImplementation(async ({ params }: any, schema: any) => schema.parse(await params));
  (ocChecks.ensureOcExists as any).mockResolvedValue(undefined);
  (ocChecks.mustBeAuthed as any).mockResolvedValue({ userId: 'u1' });
  (ocChecks.assertOcSemesterWriteAllowed as any).mockResolvedValue(undefined);
  (authz.authorizeOcAccess as any).mockResolvedValue({ userId: 'u1' });
});

describe('GET /api/v1/oc/:ocId/spr', () => {
  it('returns spr payload', async () => {
    (service.getSprView as any).mockResolvedValue({ semester: 1, rows: [], performanceReportRemarks: {} });
    const req = makeJsonRequest({ method: 'GET', path: `/api/v1/oc/${ocId}/spr?semester=1` });
    const res = await GET(req as any, { params: Promise.resolve({ ocId }) } as any);
    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/v1/oc/:ocId/spr', () => {
  it('updates spr', async () => {
    (service.upsertSprView as any).mockResolvedValue({ semester: 1, rows: [], performanceReportRemarks: {} });
    const req = makeJsonRequest({
      method: 'PATCH',
      path: `/api/v1/oc/${ocId}/spr?semester=1`,
      body: { cdrMarks: 20, subjectRemarks: { academics: 'ok' } },
    });
    const res = await PATCH(req as any, { params: Promise.resolve({ ocId }) } as any);
    expect(res.status).toBe(200);
  });

  it('returns semester_locked for a stale semester query', async () => {
    (ocChecks.assertOcSemesterWriteAllowed as any).mockRejectedValueOnce(
      new ApiError(403, 'Only the current semester can be modified.', 'semester_locked', {
        currentSemester: 4,
        requestedSemester: 2,
        supportedSemesters: [1, 2, 3, 4, 5, 6],
      })
    );

    const req = makeJsonRequest({
      method: 'PATCH',
      path: `/api/v1/oc/${ocId}/spr?semester=2`,
      body: { cdrMarks: 20, subjectRemarks: { academics: 'ok' } },
    });
    const res = await PATCH(req as any, { params: Promise.resolve({ ocId }) } as any);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('semester_locked');
    expect(body.currentSemester).toBe(4);
  });
});
