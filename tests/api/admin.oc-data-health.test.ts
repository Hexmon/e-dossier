import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/v1/admin/oc-data-health/route';
import { ApiError } from '@/app/lib/http';
import { makeJsonRequest } from '../utils/next';

vi.mock('@/app/lib/authz', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/app/db/queries/oc-data-health', () => ({
  getOcDataHealth: vi.fn(),
}));

import { requireAdmin } from '@/app/lib/authz';
import { getOcDataHealth } from '@/app/db/queries/oc-data-health';

const path = '/api/v1/admin/oc-data-health';

describe('GET /api/v1/admin/oc-data-health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAdmin as any).mockResolvedValue({
      userId: 'admin-1',
      roles: ['ADMIN'],
      claims: { apt: { position: 'ADMIN' } },
    });
    (getOcDataHealth as any).mockResolvedValue({
      generatedAt: '2026-05-12T00:00:00.000Z',
      gatePassed: true,
      activeOcCount: 33,
      totalOcCadets: 33,
      activeEnrollmentCount: 33,
      activeEnrollmentCardinalityFailures: 0,
      missingPreCommissionRows: 0,
      conflictIssueCount: 0,
      orphanIssueCount: 0,
      reconciliationAuditRows: 0,
      checks: [
        { checkName: 'active_oc_missing_pre_commission', issueCount: 0 },
      ],
      orphanChecks: [],
      auditRows: [],
    });
  });

  it('returns OC zero-loss data health for admins', async () => {
    const req = makeJsonRequest({ method: 'GET', path });
    const res = await GET(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.health.gatePassed).toBe(true);
    expect(body.health.activeOcCount).toBe(33);
    expect(body.health.missingPreCommissionRows).toBe(0);
    expect(getOcDataHealth).toHaveBeenCalledTimes(1);
  });

  it('returns 403 when admin auth fails', async () => {
    (requireAdmin as any).mockRejectedValueOnce(
      new ApiError(403, 'Admin privileges required', 'forbidden'),
    );

    const req = makeJsonRequest({ method: 'GET', path });
    const res = await GET(req as any);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('forbidden');
    expect(getOcDataHealth).not.toHaveBeenCalled();
  });
});
