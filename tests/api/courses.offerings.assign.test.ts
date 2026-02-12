import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as postAssignOfferings } from '@/app/api/v1/admin/courses/[courseId]/offerings/assign/route';
import { createRouteContext, makeJsonRequest } from '../utils/next';
import { ApiError } from '@/app/lib/http';
import * as authz from '@/app/lib/authz';
import * as courseQueries from '@/app/db/queries/courses';
import * as offeringQueries from '@/app/db/queries/offerings';

vi.mock('@/app/lib/authz', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/app/db/queries/courses', () => ({
  getCourse: vi.fn(),
}));

vi.mock('@/app/db/queries/offerings', () => ({
  assignOfferingsToCourse: vi.fn(),
}));

const targetCourseId = '11111111-1111-4111-8111-111111111111';
const sourceCourseId = '22222222-2222-4222-8222-222222222222';
const basePath = `/api/v1/admin/courses/${targetCourseId}/offerings/assign`;

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(authz.requireAuth).mockResolvedValue({
    userId: 'admin-1',
    roles: ['ADMIN'],
    claims: {},
  } as Awaited<ReturnType<typeof authz.requireAuth>>);

  vi.mocked(courseQueries.getCourse).mockImplementation(async (id: string) => ({
    id,
    code: id === targetCourseId ? 'TGT-1' : 'SRC-1',
    title: 'Course',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as any));

  vi.mocked(offeringQueries.assignOfferingsToCourse).mockResolvedValue({
    createdCount: 2,
    skippedCount: 1,
    created: [
      { subjectId: '33333333-3333-4333-8333-333333333333', semester: 1 },
      { subjectId: '44444444-4444-4444-8444-444444444444', semester: 2 },
    ],
    skipped: [
      {
        subjectId: '55555555-5555-4555-8555-555555555555',
        semester: 2,
        reason: 'duplicate' as const,
      },
    ],
  });
});

describe('POST /api/v1/admin/courses/:courseId/offerings/assign', () => {
  it('returns 401 when authentication fails', async () => {
    vi.mocked(authz.requireAuth).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized')
    );

    const req = makeJsonRequest({
      method: 'POST',
      path: basePath,
      body: { sourceCourseId, mode: 'copy' },
    });

    const res = await postAssignOfferings(req as any, createRouteContext({ courseId: targetCourseId }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for forbidden user', async () => {
    vi.mocked(authz.requireAuth).mockRejectedValueOnce(
      new ApiError(403, 'Forbidden', 'forbidden')
    );

    const req = makeJsonRequest({
      method: 'POST',
      path: basePath,
      body: { sourceCourseId, mode: 'copy' },
    });

    const res = await postAssignOfferings(req as any, createRouteContext({ courseId: targetCourseId }));
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid payload', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: basePath,
      body: { sourceCourseId: 'invalid-id', mode: 'copy' },
    });

    const res = await postAssignOfferings(req as any, createRouteContext({ courseId: targetCourseId }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when source and target are the same', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: basePath,
      body: { sourceCourseId: targetCourseId, mode: 'copy' },
    });

    const res = await postAssignOfferings(req as any, createRouteContext({ courseId: targetCourseId }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('bad_request');
    expect(offeringQueries.assignOfferingsToCourse).not.toHaveBeenCalled();
  });

  it('returns 404 when target course is not found', async () => {
    vi.mocked(courseQueries.getCourse).mockResolvedValueOnce(null);

    const req = makeJsonRequest({
      method: 'POST',
      path: basePath,
      body: { sourceCourseId, mode: 'copy' },
    });

    const res = await postAssignOfferings(req as any, createRouteContext({ courseId: targetCourseId }));
    expect(res.status).toBe(404);
  });

  it('returns 404 when source course is not found', async () => {
    vi.mocked(courseQueries.getCourse)
      .mockResolvedValueOnce({
        id: targetCourseId,
        code: 'TGT-1',
        title: 'Target',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as any)
      .mockResolvedValueOnce(null);

    const req = makeJsonRequest({
      method: 'POST',
      path: basePath,
      body: { sourceCourseId, mode: 'copy' },
    });

    const res = await postAssignOfferings(req as any, createRouteContext({ courseId: targetCourseId }));
    expect(res.status).toBe(404);
  });

  it('copies offerings and returns created/skipped summary', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: basePath,
      body: { sourceCourseId, mode: 'copy' },
    });

    const res = await postAssignOfferings(req as any, createRouteContext({ courseId: targetCourseId }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.createdCount).toBe(2);
    expect(body.skippedCount).toBe(1);
    expect(body.skipped[0].reason).toBe('duplicate');
    expect(body.conflicts).toEqual(body.skipped);

    expect(offeringQueries.assignOfferingsToCourse).toHaveBeenCalledWith({
      sourceCourseId,
      targetCourseId,
      semester: undefined,
      subjectIds: undefined,
    });
  });

  it('applies semester/subject filters', async () => {
    const filteredSubjectId = '66666666-6666-4666-8666-666666666666';

    const req = makeJsonRequest({
      method: 'POST',
      path: basePath,
      body: {
        sourceCourseId,
        mode: 'copy',
        semester: 3,
        subjectIds: [filteredSubjectId],
      },
    });

    const res = await postAssignOfferings(req as any, createRouteContext({ courseId: targetCourseId }));
    expect(res.status).toBe(200);

    expect(offeringQueries.assignOfferingsToCourse).toHaveBeenCalledWith({
      sourceCourseId,
      targetCourseId,
      semester: 3,
      subjectIds: [filteredSubjectId],
    });
  });
});
