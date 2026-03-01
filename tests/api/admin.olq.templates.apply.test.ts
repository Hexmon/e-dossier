import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/v1/admin/olq/templates/apply/route';
import { makeJsonRequest, createRouteContext } from '../utils/next';
import { ApiError } from '@/app/lib/http';

vi.mock('@/app/lib/acx/feature-flag', () => ({
  isAuthzV2Enabled: () => false,
}));

vi.mock('@/app/lib/authz', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/app/lib/olq/template-apply', () => ({
  applyOlqDefaultTemplate: vi.fn(),
}));

import { requireAdmin } from '@/app/lib/authz';
import { applyOlqDefaultTemplate } from '@/app/lib/olq/template-apply';

describe('POST /api/v1/admin/olq/templates/apply', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      userId: 'admin-user-1',
      roles: ['ADMIN'],
      claims: {},
    } as Awaited<ReturnType<typeof requireAdmin>>);
  });

  it('runs dry-run for selected course', async () => {
    vi.mocked(applyOlqDefaultTemplate).mockResolvedValue({
      scope: 'course',
      dryRun: true,
      mode: 'replace',
      totalCourses: 1,
      successCount: 1,
      errorCount: 0,
      createdCount: 19,
      updatedCount: 0,
      skippedCount: 0,
      results: [
        {
          courseId: '11111111-1111-4111-8111-111111111111',
          status: 'ok',
          categoriesCreated: 4,
          categoriesUpdated: 0,
          categoriesSkipped: 0,
          subtitlesCreated: 15,
          subtitlesUpdated: 0,
          subtitlesSkipped: 0,
          warnings: [],
        },
      ],
    });

    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/admin/olq/templates/apply',
      body: {
        scope: 'course',
        courseId: '11111111-1111-4111-8111-111111111111',
        mode: 'replace',
        dryRun: true,
      },
    });

    const res = await POST(req as any, createRouteContext() as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.scope).toBe('course');
    expect(body.dryRun).toBe(true);
    expect(applyOlqDefaultTemplate).toHaveBeenCalledWith({
      scope: 'course',
      courseId: '11111111-1111-4111-8111-111111111111',
      mode: 'replace',
      dryRun: true,
      actorUserId: 'admin-user-1',
    });
  });

  it('runs apply for all courses', async () => {
    vi.mocked(applyOlqDefaultTemplate).mockResolvedValue({
      scope: 'all',
      dryRun: false,
      mode: 'upsert_missing',
      totalCourses: 2,
      successCount: 2,
      errorCount: 0,
      createdCount: 8,
      updatedCount: 10,
      skippedCount: 20,
      results: [],
    });

    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/admin/olq/templates/apply',
      body: {
        scope: 'all',
        mode: 'upsert_missing',
      },
    });

    const res = await POST(req as any, createRouteContext() as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.scope).toBe('all');
    expect(body.dryRun).toBe(false);
    expect(applyOlqDefaultTemplate).toHaveBeenCalledWith({
      scope: 'all',
      courseId: undefined,
      mode: 'upsert_missing',
      dryRun: false,
      actorUserId: 'admin-user-1',
    });
  });

  it('returns 400 when scope=course and courseId missing', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/admin/olq/templates/apply',
      body: {
        scope: 'course',
        mode: 'replace',
      },
    });

    const res = await POST(req as any, createRouteContext() as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
  });

  it('returns 401 when admin auth fails', async () => {
    vi.mocked(requireAdmin).mockRejectedValue(
      new ApiError(401, 'Unauthorized', 'unauthorized')
    );

    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/admin/olq/templates/apply',
      body: {
        scope: 'all',
      },
    });

    const res = await POST(req as any, createRouteContext() as any);
    expect(res.status).toBe(401);
  });
});
