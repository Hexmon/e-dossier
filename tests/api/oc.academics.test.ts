import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as listAcademicsRoute } from '@/app/api/v1/oc/[ocId]/academics/route';
import {
  GET as getAcademicSemesterRoute,
  PATCH as patchAcademicSummaryRoute,
  DELETE as deleteAcademicSemesterRoute,
} from '@/app/api/v1/oc/[ocId]/academics/[semester]/route';
import {
  PATCH as patchAcademicSubjectRoute,
  DELETE as deleteAcademicSubjectRoute,
} from '@/app/api/v1/oc/[ocId]/academics/[semester]/subjects/[subjectId]/route';
import { makeJsonRequest, createRouteContext } from '../utils/next';
import { ApiError } from '@/app/lib/http';
import * as ocChecks from '@/app/api/v1/oc/_checks';
import * as academicServices from '@/app/services/oc-academics';
import * as authz from '@/lib/authorization';

vi.mock('@/app/api/v1/oc/_checks', () => ({
  parseParam: vi.fn(),
  ensureOcExists: vi.fn(),
  mustBeAcademicsEditor: vi.fn(),
}));

vi.mock('@/lib/authorization', () => ({
  authorizeOcAccess: vi.fn(),
}));

vi.mock('@/app/services/oc-academics', () => ({
  getOcAcademics: vi.fn(async () => []),
  getOcAcademicSemester: vi.fn(async () => ({
    semester: 1,
    branchTag: 'C',
    sgpa: null,
    cgpa: null,
    marksScored: null,
    subjects: [],
    createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2024-01-01T00:00:00Z').toISOString(),
  })),
  updateOcAcademicSummary: vi.fn(async () => ({
    semester: 1,
    branchTag: 'C',
    sgpa: 8.2,
    cgpa: 7.9,
    marksScored: 420,
    subjects: [],
    createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2024-01-02T00:00:00Z').toISOString(),
  })),
  updateOcAcademicSubject: vi.fn(async () => ({
    semester: 1,
    branchTag: 'C',
    sgpa: 8.2,
    cgpa: 7.9,
    marksScored: 420,
    subjects: [
      {
        offeringId: 'off-1',
        includeTheory: true,
        includePractical: true,
        theoryCredits: 3,
        practicalCredits: 1,
        subject: {
          id: 'sub-1',
          code: 'PHY101',
          name: 'Physics I',
          branch: 'C',
          hasTheory: true,
          hasPractical: true,
          defaultTheoryCredits: 3,
          defaultPracticalCredits: 1,
          description: null,
          createdAt: null,
          updatedAt: null,
          deletedAt: null,
        },
        theory: {
          phaseTest1Marks: 20,
          phaseTest2Marks: 21,
          tutorial: 'Lab pending',
          finalMarks: 55,
          grade: 'A',
          sessionalMarks: 41,
          totalMarks: 96,
        },
        practical: {
          finalMarks: 40,
          grade: 'A',
          tutorial: null,
          totalMarks: 40,
        },
      },
    ],
    createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2024-01-02T00:00:00Z').toISOString(),
  })),
  deleteOcAcademicSemester: vi.fn(async () => ({ semester: 1, hardDeleted: false })),
  deleteOcAcademicSubject: vi.fn(async () => ({
    semester: 1,
    branchTag: 'C',
    sgpa: null,
    cgpa: null,
    marksScored: null,
    subjects: [],
    createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2024-01-02T00:00:00Z').toISOString(),
  })),
}));

const basePath = '/api/v1/oc';
const ocId = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  vi.clearAllMocks();
  (ocChecks.parseParam as any).mockImplementation(async (_ctx: any, schema: any) => schema.parse(_ctx.params));
  (ocChecks.ensureOcExists as any).mockResolvedValue(undefined);
  (authz.authorizeOcAccess as any).mockResolvedValue({ userId: 'u1' });
});

describe('GET /api/v1/oc/:ocId/academics', () => {
  it('returns 403 when authorization fails', async () => {
    (authz.authorizeOcAccess as any).mockRejectedValueOnce(new ApiError(403, 'Forbidden', 'forbidden'));
    (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId });
    const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${ocId}/academics` });
    const ctx = { params: Promise.resolve({ ocId }) } as any;
    const res = await listAcademicsRoute(req as any, ctx);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('forbidden');
  });

  it('returns academic semesters on success', async () => {
    (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId });
    (academicServices.getOcAcademics as any).mockResolvedValueOnce([
      {
        semester: 1,
        branchTag: 'C',
        sgpa: null,
        cgpa: null,
        marksScored: null,
        subjects: [],
        createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
        updatedAt: new Date('2024-01-01T00:00:00Z').toISOString(),
      },
    ]);
    const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${ocId}/academics` });
    const ctx = { params: Promise.resolve({ ocId }) } as any;
    const res = await listAcademicsRoute(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.items).toHaveLength(1);
  });

  it('returns 400 for invalid semester query', async () => {
    (ocChecks.parseParam as any).mockResolvedValueOnce({ ocId });
    const req = makeJsonRequest({
      method: 'GET',
      path: `${basePath}/${ocId}/academics?semester=invalid`,
    });
    const ctx = { params: Promise.resolve({ ocId }) } as any;
    const res = await listAcademicsRoute(req as any, ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.message).toBe('Validation failed');
  });
});

describe('GET /api/v1/oc/:ocId/academics/:semester', () => {
  it('returns academic semester', async () => {
    (ocChecks.parseParam as any)
      .mockResolvedValueOnce({ ocId })
      .mockResolvedValueOnce({ semester: 1 });
    const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${ocId}/academics/1` });
    const ctx = { params: Promise.resolve({ ocId, semester: '1' }) } as any;
    const res = await getAcademicSemesterRoute(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.semester).toBe(1);
  });

});

describe('PATCH /api/v1/oc/:ocId/academics/:semester', () => {
  it('blocks write when caller has read-only academics access', async () => {
    (ocChecks.mustBeAcademicsEditor as any).mockRejectedValueOnce(
      new ApiError(403, 'You do not have permission to modify academics.', 'forbidden')
    );
    const req = makeJsonRequest({
      method: 'PATCH',
      path: `${basePath}/${ocId}/academics/1`,
      body: { sgpa: 8.2 },
    });
    const ctx = { params: Promise.resolve({ ocId, semester: '1' }) } as any;
    const res = await patchAcademicSummaryRoute(req as any, ctx);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toBe('You do not have permission to modify academics.');
  });

  it('updates academic summary on success', async () => {
    (ocChecks.mustBeAcademicsEditor as any).mockResolvedValueOnce({ userId: 'pc-user' });
    (ocChecks.parseParam as any)
      .mockResolvedValueOnce({ ocId })
      .mockResolvedValueOnce({ semester: 1 });
    const req = makeJsonRequest({
      method: 'PATCH',
      path: `${basePath}/${ocId}/academics/1`,
      body: { sgpa: 8.4, cgpa: 7.8 },
    });
    const ctx = { params: Promise.resolve({ ocId, semester: '1' }) } as any;
    const res = await patchAcademicSummaryRoute(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.sgpa).toBe(8.2);
    expect(academicServices.updateOcAcademicSummary).toHaveBeenCalled();
  });
});

describe('DELETE /api/v1/oc/:ocId/academics/:semester', () => {
  it('soft deletes semester', async () => {
    (ocChecks.mustBeAcademicsEditor as any).mockResolvedValueOnce({ userId: 'pc-user' });
    (ocChecks.parseParam as any)
      .mockResolvedValueOnce({ ocId })
      .mockResolvedValueOnce({ semester: 1 });
    const req = makeJsonRequest({
      method: 'DELETE',
      path: `${basePath}/${ocId}/academics/1`,
    });
    const ctx = { params: Promise.resolve({ ocId, semester: '1' }) } as any;
    const res = await deleteAcademicSemesterRoute(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.semester).toBe(1);
  });

  it('hard deletes semester', async () => {
    (ocChecks.mustBeAcademicsEditor as any).mockResolvedValueOnce({ userId: 'pc-user' });
    (ocChecks.parseParam as any)
      .mockResolvedValueOnce({ ocId })
      .mockResolvedValueOnce({ semester: 1 });
    (academicServices.deleteOcAcademicSemester as any).mockResolvedValueOnce({
      semester: 1,
      hardDeleted: true,
    });
    const req = makeJsonRequest({
      method: 'DELETE',
      path: `${basePath}/${ocId}/academics/1?hard=true`,
    });
    const ctx = { params: Promise.resolve({ ocId, semester: '1' }) } as any;
    const res = await deleteAcademicSemesterRoute(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/hard-deleted/i);
  });
});

describe('PATCH /api/v1/oc/:ocId/academics/:semester/subjects/:subjectId', () => {
  it('updates subject marks', async () => {
    (ocChecks.mustBeAcademicsEditor as any).mockResolvedValueOnce({ userId: 'pc-user' });
    (ocChecks.parseParam as any)
      .mockResolvedValueOnce({ ocId })
      .mockResolvedValueOnce({ semester: 1 })
      .mockResolvedValueOnce({ subjectId: '22222222-2222-4222-8222-222222222222' });
    const req = makeJsonRequest({
      method: 'PATCH',
      path: `${basePath}/${ocId}/academics/1/subjects/22222222-2222-4222-8222-222222222222`,
      body: {
        theory: { phaseTest1Marks: 20 },
        practical: { finalMarks: 40 },
      },
    });
    const ctx = {
      params: Promise.resolve({
        ocId,
        semester: '1',
        subjectId: '22222222-2222-4222-8222-222222222222',
      }),
    } as any;
    const res = await patchAcademicSubjectRoute(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.subjects[0].subject.code).toBe('PHY101');
    expect(academicServices.updateOcAcademicSubject).toHaveBeenCalled();
  });
});

describe('DELETE /api/v1/oc/:ocId/academics/:semester/subjects/:subjectId', () => {
  it('deletes subject entry', async () => {
    (ocChecks.mustBeAcademicsEditor as any).mockResolvedValueOnce({ userId: 'pc-user' });
    (ocChecks.parseParam as any)
      .mockResolvedValueOnce({ ocId })
      .mockResolvedValueOnce({ semester: 1 })
      .mockResolvedValueOnce({ subjectId: '22222222-2222-4222-8222-222222222222' });
    const req = makeJsonRequest({
      method: 'DELETE',
      path: `${basePath}/${ocId}/academics/1/subjects/22222222-2222-4222-8222-222222222222`,
    });
    const ctx = {
      params: Promise.resolve({
        ocId,
        semester: '1',
        subjectId: '22222222-2222-4222-8222-222222222222',
      }),
    } as any;
    const res = await deleteAcademicSubjectRoute(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.semester).toBe(1);
  });

  it('hard deletes subject entry', async () => {
    (ocChecks.mustBeAcademicsEditor as any).mockResolvedValueOnce({ userId: 'pc-user' });
    (ocChecks.parseParam as any)
      .mockResolvedValueOnce({ ocId })
      .mockResolvedValueOnce({ semester: 1 })
      .mockResolvedValueOnce({ subjectId: '22222222-2222-4222-8222-222222222222' });
    const req = makeJsonRequest({
      method: 'DELETE',
      path: `${basePath}/${ocId}/academics/1/subjects/22222222-2222-4222-8222-222222222222?hard=true`,
    });
    const ctx = {
      params: Promise.resolve({
        ocId,
        semester: '1',
        subjectId: '22222222-2222-4222-8222-222222222222',
      }),
    } as any;
    const res = await deleteAcademicSubjectRoute(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/hard-deleted/i);
  });
});
