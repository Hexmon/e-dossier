import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/app/lib/http';
import { GET, PUT } from '@/app/api/v1/admin/warning-management/route';
import { makeJsonRequest } from '../utils/next';

vi.mock('@/app/lib/authz', () => ({
  requireAuth: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock('@/app/services/warningManagement', () => ({
  listWarningSettingsForAdmin: vi.fn(),
  updateWarningSettingsForAdmin: vi.fn(),
}));

import { requireAdmin, requireAuth } from '@/app/lib/authz';
import {
  listWarningSettingsForAdmin,
  updateWarningSettingsForAdmin,
} from '@/app/services/warningManagement';

function attachAudit(req: any) {
  req.audit = { log: vi.fn(async () => undefined) };
  return req;
}

describe('admin warning management API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue({ userId: 'user-1', roles: ['PL_CDR'] });
    (requireAdmin as any).mockResolvedValue({ userId: 'admin-1', roles: ['ADMIN'] });
    (listWarningSettingsForAdmin as any).mockResolvedValue({
      intro: 'Warnings are issued from restriction points.',
      criteria: [
        {
          criterionKey: 'pi-cdr-single-term',
          positionKey: 'pi-cdr',
          positionName: 'PI Cdr',
          triggerType: 'SINGLE_TERM',
          restrictionPoints: 10,
          isEnabled: true,
        },
      ],
    });
    (updateWarningSettingsForAdmin as any).mockResolvedValue({
      intro: 'Warnings are issued from restriction points.',
      criteria: [
        {
          criterionKey: 'pi-cdr-single-term',
          positionKey: 'pi-cdr',
          positionName: 'PI Cdr',
          triggerType: 'SINGLE_TERM',
          restrictionPoints: 12,
          isEnabled: true,
        },
      ],
    });
  });

  it('GET returns warning settings with defaults for authenticated non-admin users', async () => {
    const req = attachAudit(makeJsonRequest({ method: 'GET', path: '/api/v1/admin/warning-management' }));
    const res = await GET(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.criteria[0].restrictionPoints).toBe(10);
    expect(body.intro).toContain('restriction points');
    expect(requireAuth).toHaveBeenCalled();
    expect(requireAdmin).not.toHaveBeenCalled();
  });

  it('PUT updates warning settings', async () => {
    const payload = {
      criteria: [
        {
          criterionKey: 'pi-cdr-single-term',
          positionKey: 'pi-cdr',
          positionName: 'PI Cdr',
          triggerType: 'SINGLE_TERM',
          restrictionPoints: 12,
          isEnabled: true,
        },
      ],
    };
    const req = attachAudit(
      makeJsonRequest({ method: 'PUT', path: '/api/v1/admin/warning-management', body: payload }),
    );
    const res = await PUT(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.criteria[0].restrictionPoints).toBe(12);
    expect(updateWarningSettingsForAdmin).toHaveBeenCalledWith(payload, 'admin-1');
  });

  it('GET returns 401 when authentication fails', async () => {
    (requireAuth as any).mockRejectedValueOnce(new ApiError(401, 'Unauthorized', 'unauthorized'));
    const req = attachAudit(makeJsonRequest({ method: 'GET', path: '/api/v1/admin/warning-management' }));
    const res = await GET(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('unauthorized');
  });

  it('PUT returns 403 when admin auth fails', async () => {
    (requireAdmin as any).mockRejectedValueOnce(new ApiError(403, 'Forbidden', 'forbidden'));
    const req = attachAudit(
      makeJsonRequest({ method: 'PUT', path: '/api/v1/admin/warning-management', body: { criteria: [] } }),
    );
    const res = await PUT(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('forbidden');
  });
});
