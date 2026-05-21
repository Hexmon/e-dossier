import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getCourses, POST as postCourses } from '@/app/api/v1/admin/courses/route';
import { makeJsonRequest, createRouteContext } from '../utils/next';
import { ApiError } from '@/app/lib/http';
import * as authz from '@/app/lib/authz';
import * as coursesQueries from '@/app/db/queries/courses';

vi.mock('@/app/lib/authz', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/app/db/queries/courses', () => ({
  listCourses: vi.fn(async () => []),
  countCourses: vi.fn(async () => 0),
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

const path = '/api/v1/courses';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/courses', () => {
  it('returns 401 when authentication fails', async () => {
    (authz.requireAuth as any).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );

    const req = makeJsonRequest({ method: 'GET', path });
    const res = await getCourses(req as any, createRouteContext());

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

    const res = await getCourses(req as any, createRouteContext());
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
    (coursesQueries.countCourses as any).mockResolvedValueOnce(12);

    const req = makeJsonRequest({
      method: 'GET',
      path: `${path}?q=TES&includeDeleted=true&limit=10&offset=5`,
    });

    const res = await getCourses(req as any, createRouteContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.items).toHaveLength(2);
    expect(body.count).toBe(2);
    expect(body.total).toBe(12);
    expect(body.limit).toBe(10);
    expect(body.offset).toBe(5);
    expect(coursesQueries.listCourses).toHaveBeenCalledWith({
      q: 'TES',
      includeDeleted: true,
      limit: 10,
      offset: 5,
    });
    expect(coursesQueries.countCourses).toHaveBeenCalledWith({
      q: 'TES',
      includeDeleted: true,
    });
  });
});

describe('POST /api/v1/courses', () => {
  it('returns 401 when not authenticated', async () => {
    (authz.requireAuth as any).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );

    const req = makeJsonRequest({ method: 'POST', path, body: {} });
    const res = await postCourses(req as any, createRouteContext());

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns 403 when user lacks admin privileges', async () => {
    (authz.requireAuth as any).mockRejectedValueOnce(
      new ApiError(403, 'Admin privileges required', 'forbidden'),
    );

    const req = makeJsonRequest({
      method: 'POST',
      path,
      body: { code: 'TES-50', title: 'Course 50', notes: 'Intro' },
    });

    const res = await postCourses(req as any, createRouteContext());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('forbidden');
  });

  it('returns 400 when request body fails validation', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({
      userId: 'admin-1',
      roles: ['ADMIN'],
    });

    const req = makeJsonRequest({ method: 'POST', path, body: { code: '' } });
    const res = await postCourses(req as any, createRouteContext());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('bad_request');
  });

  it('returns 409 when course code already exists', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({
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

    const res = await postCourses(req as any, createRouteContext());
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('conflict');
  });

  it('creates a course on happy path', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({
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

    const res = await postCourses(req as any, createRouteContext());
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.course.id).toBe('course-1');
    expect(body.course.code).toBe('TES-50');
  });

  it('normalizes sequence course codes before creating a course', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({
      userId: 'admin-1',
      roles: ['ADMIN'],
    });

    const req = makeJsonRequest({
      method: 'POST',
      path,
      body: { code: 'tes=051', title: 'Course 51' },
    });

    const res = await postCourses(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.course.code).toBe('TES-51');
    expect(coursesQueries.createCourse).toHaveBeenCalledWith({
      code: 'TES-51',
      title: 'Course 51',
      notes: undefined,
    });
  });
});
