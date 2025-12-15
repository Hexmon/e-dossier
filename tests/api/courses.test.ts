import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getCourses, POST as postCourses } from '@/app/api/v1/admin/courses/route';
import { makeJsonRequest } from '../utils/next';
import { ApiError } from '@/app/lib/http';
import * as authz from '@/app/lib/authz';
import * as coursesQueries from '@/app/db/queries/courses';
import * as auditLog from '@/lib/audit-log';

vi.mock('@/app/lib/authz', () => ({
  requireAuth: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock('@/app/db/queries/courses', () => ({
  listCourses: vi.fn(async () => []),
  createCourse: vi.fn(async (data: any) => ({
    id: 'course-1',
    code: data.code,
    title: data.title,
    notes: data.notes ?? null,
  })),
  getCourse: vi.fn(),
  listCourseOfferings: vi.fn(),
  softDeleteCourse: vi.fn(),
  updateCourse: vi.fn(),
}));

vi.mock('@/lib/audit-log', () => ({
  createAuditLog: vi.fn(async () => {}),
  logApiRequest: vi.fn(),
  ensureRequestContext: vi.fn(() => ({
    requestId: 'test',
    method: 'GET',
    pathname: '/',
    url: '/',
    startTime: Date.now(),
  })),
  noteRequestActor: vi.fn(),
  setRequestTenant: vi.fn(),
  AuditEventType: {
    COURSE_CREATED: 'course.created',
    COURSE_UPDATED: 'course.updated',
    COURSE_DELETED: 'course.deleted',
  },
  AuditResourceType: {
    COURSE: 'course',
  },
}));

const path = '/api/v1/courses';

beforeEach(() => {
  vi.clearAllMocks();
  (auditLog.createAuditLog as any).mockClear?.();
});

describe('GET /api/v1/courses', () => {
  it('returns 401 when authentication fails', async () => {
    (authz.requireAuth as any).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );

    const req = makeJsonRequest({ method: 'GET', path });
    const res = await getCourses(req as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns 400 for invalid query parameters', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'u1', roles: [] });

    const req = makeJsonRequest({
      method: 'GET',
      path: `${path}?limit=0`, // limit must be >= 1
    });

    const res = await getCourses(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('bad_request');
  });

  it('returns filtered list of courses on happy path', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'u1', roles: [] });
    (coursesQueries.listCourses as any).mockResolvedValueOnce([
      { id: 'c1', code: 'TES-1', title: 'Course 1', notes: null },
      { id: 'c2', code: 'TES-2', title: 'Course 2', notes: null },
    ]);

    const req = makeJsonRequest({
      method: 'GET',
      path: `${path}?q=TES&includeDeleted=true&limit=10&offset=5`,
    });

    const res = await getCourses(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.items).toHaveLength(2);
    expect(body.count).toBe(2);
    expect(coursesQueries.listCourses).toHaveBeenCalledWith({
      q: 'TES',
      includeDeleted: true,
      limit: 10,
      offset: 5,
    });
  });
});

describe('POST /api/v1/courses', () => {
  it('returns 401 when not authenticated', async () => {
    (authz.requireAdmin as any).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );

    const req = makeJsonRequest({ method: 'POST', path, body: {} });
    const res = await postCourses(req as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns 403 when user lacks admin privileges', async () => {
    (authz.requireAdmin as any).mockRejectedValueOnce(
      new ApiError(403, 'Admin privileges required', 'forbidden'),
    );

    const req = makeJsonRequest({
      method: 'POST',
      path,
      body: { code: 'TES-50', title: 'Course 50', notes: 'Intro' },
    });

    const res = await postCourses(req as any);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('forbidden');
  });

  it('returns 400 when request body fails validation', async () => {
    (authz.requireAdmin as any).mockResolvedValueOnce({
      userId: 'admin-1',
      roles: ['ADMIN'],
    });

    const req = makeJsonRequest({ method: 'POST', path, body: { code: '' } });
    const res = await postCourses(req as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('bad_request');
  });

  it('returns 409 when course code already exists', async () => {
    (authz.requireAdmin as any).mockResolvedValueOnce({
      userId: 'admin-1',
      roles: ['ADMIN'],
    });

    (coursesQueries.createCourse as any).mockRejectedValueOnce(
      Object.assign(new Error('duplicate'), { code: '23505' }),
    );

    const req = makeJsonRequest({
      method: 'POST',
      path,
      body: { code: 'TES-50', title: 'Course 50' },
    });

    const res = await postCourses(req as any);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('conflict');
  });

  it('creates a course on happy path', async () => {
    (authz.requireAdmin as any).mockResolvedValueOnce({
      userId: 'admin-1',
      roles: ['ADMIN'],
    });

    (coursesQueries.createCourse as any).mockResolvedValueOnce({
      id: 'course-1',
      code: 'TES-50',
      title: 'Course 50',
      notes: null,
    });

    const req = makeJsonRequest({
      method: 'POST',
      path,
      body: { code: 'TES-50', title: 'Course 50', notes: 'Intro' },
    });

    const res = await postCourses(req as any);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.course.id).toBe('course-1');
    expect(body.course.code).toBe('TES-50');
    expect(auditLog.createAuditLog).toHaveBeenCalled();
  });
});
