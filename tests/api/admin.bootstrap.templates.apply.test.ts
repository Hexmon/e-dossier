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

import { requireAdmin } from '@/app/lib/authz';
import { applyPtTemplateProfile } from '@/app/lib/bootstrap/pt-template';
import { applyCampTemplateProfile } from '@/app/lib/bootstrap/camp-template';

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
