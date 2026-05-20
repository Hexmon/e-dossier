import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/v1/admin/bootstrap/templates/apply/route';
import { makeJsonRequest, createRouteContext } from '../utils/next';
import { ApiError } from '@/app/lib/http';

vi.mock('@/app/lib/acx/feature-flag', () => ({
  isAuthzV2Enabled: () => false,
}));

vi.mock('@/app/lib/authz', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/app/lib/bootstrap/pt-template', () => ({
  applyPtTemplateProfile: vi.fn(),
}));

vi.mock('@/app/lib/bootstrap/camp-template', () => ({
  applyCampTemplateProfile: vi.fn(),
}));

vi.mock('@/app/lib/bootstrap/appointment-template', () => ({
  applyAppointmentTemplateProfile: vi.fn(),
}));

import { requireAdmin } from '@/app/lib/authz';
import { applyPtTemplateProfile } from '@/app/lib/bootstrap/pt-template';
import { applyCampTemplateProfile } from '@/app/lib/bootstrap/camp-template';
import { applyAppointmentTemplateProfile } from '@/app/lib/bootstrap/appointment-template';

describe('POST /api/v1/admin/bootstrap/templates/apply', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      userId: 'admin-user-1',
      roles: ['ADMIN'],
      claims: {},
    } as Awaited<ReturnType<typeof requireAdmin>>);
  });

  it('runs dry-run apply and returns summary', async () => {
    vi.mocked(applyPtTemplateProfile).mockResolvedValue({
      module: 'pt',
      profile: 'default',
      dryRun: true,
      createdCount: 10,
      updatedCount: 2,
      skippedCount: 30,
      warnings: [],
      stats: {
        ptTypes: { created: 1, updated: 0, skipped: 5 },
        attempts: { created: 2, updated: 0, skipped: 6 },
        grades: { created: 3, updated: 1, skipped: 7 },
        tasks: { created: 2, updated: 0, skipped: 8 },
        taskScores: { created: 1, updated: 1, skipped: 2 },
        motivationFields: { created: 1, updated: 0, skipped: 2 },
      },
    });

    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/admin/bootstrap/templates/apply',
      body: {
        module: 'pt',
        profile: 'default',
        dryRun: true,
      },
    });

    const res = await POST(req as any, createRouteContext() as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
    expect(body.createdCount).toBe(10);
    expect(applyPtTemplateProfile).toHaveBeenCalledWith({
      profile: 'default',
      dryRun: true,
      actorUserId: 'admin-user-1',
    });
  });

  it('forwards courseId when applying PT defaults to a selected course', async () => {
    vi.mocked(applyPtTemplateProfile).mockResolvedValue({
      module: 'pt',
      profile: 'default',
      courseId: '11111111-1111-4111-8111-111111111111',
      dryRun: false,
      createdCount: 42,
      updatedCount: 0,
      skippedCount: 0,
      warnings: [],
      stats: {
        ptTypes: { created: 4, updated: 0, skipped: 0 },
        attempts: { created: 5, updated: 0, skipped: 0 },
        grades: { created: 9, updated: 0, skipped: 0 },
        tasks: { created: 4, updated: 0, skipped: 0 },
        taskScores: { created: 16, updated: 0, skipped: 0 },
        motivationFields: { created: 4, updated: 0, skipped: 0 },
      },
    });

    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/admin/bootstrap/templates/apply',
      body: {
        module: 'pt',
        profile: 'default',
        dryRun: false,
        courseId: '11111111-1111-4111-8111-111111111111',
      },
    });

    const res = await POST(req as any, createRouteContext() as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.courseId).toBe('11111111-1111-4111-8111-111111111111');
    expect(applyPtTemplateProfile).toHaveBeenCalledWith({
      profile: 'default',
      dryRun: false,
      courseId: '11111111-1111-4111-8111-111111111111',
      actorUserId: 'admin-user-1',
    });
  });

  it('rejects invalid PT courseId before applying defaults', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/admin/bootstrap/templates/apply',
      body: {
        module: 'pt',
        profile: 'default',
        dryRun: false,
        courseId: 'not-a-uuid',
      },
    });

    const res = await POST(req as any, createRouteContext() as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(applyPtTemplateProfile).not.toHaveBeenCalled();
  });

  it('rejects unsupported module via validation', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/admin/bootstrap/templates/apply',
      body: {
        module: 'academics',
        dryRun: true,
      },
    });

    const res = await POST(req as any, createRouteContext() as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
  });

  it('runs camp apply and returns summary', async () => {
    vi.mocked(applyCampTemplateProfile).mockResolvedValue({
      module: 'camp',
      profile: 'default',
      dryRun: false,
      createdCount: 3,
      updatedCount: 2,
      skippedCount: 1,
      warnings: [],
      stats: {
        camps: { created: 1, updated: 1, skipped: 1 },
        activities: { created: 2, updated: 1, skipped: 0 },
      },
    });

    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/admin/bootstrap/templates/apply',
      body: {
        module: 'camp',
        profile: 'default',
      },
    });

    const res = await POST(req as any, createRouteContext() as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.module).toBe('camp');
    expect(applyCampTemplateProfile).toHaveBeenCalledWith({
      profile: 'default',
      dryRun: false,
      actorUserId: 'admin-user-1',
    });
  });

  it('runs appointment template apply and returns position/assignment stats', async () => {
    vi.mocked(applyAppointmentTemplateProfile).mockResolvedValue({
      module: 'appointment',
      profile: 'default',
      dryRun: false,
      createdCount: 12,
      updatedCount: 0,
      skippedCount: 11,
      warnings: ['Skipped assignment for "missing@army.mil" because user does not exist.'],
      stats: {
        positions: { created: 9, updated: 0, skipped: 0 },
        assignments: { created: 3, updated: 0, skipped: 11 },
      },
    });

    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/admin/bootstrap/templates/apply',
      body: {
        module: 'appointment',
        profile: 'default',
      },
    });

    const res = await POST(req as any, createRouteContext() as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.module).toBe('appointment');
    expect(body.stats.positions.created).toBe(9);
    expect(body.warnings).toHaveLength(1);
    expect(applyAppointmentTemplateProfile).toHaveBeenCalledWith({
      profile: 'default',
      dryRun: false,
      actorUserId: 'admin-user-1',
    });
  });

  it('returns unauthorized when admin auth fails', async () => {
    vi.mocked(requireAdmin).mockRejectedValue(
      new ApiError(401, 'Unauthorized', 'unauthorized')
    );

    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/admin/bootstrap/templates/apply',
      body: {
        module: 'pt',
      },
    });

    const res = await POST(req as any, createRouteContext() as any);
    expect(res.status).toBe(401);
  });
});
