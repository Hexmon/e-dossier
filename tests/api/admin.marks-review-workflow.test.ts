import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/app/lib/http';
import { GET, PUT } from '@/app/api/v1/admin/marks-review-workflow/route';
import { makeJsonRequest } from '../utils/next';

vi.mock('@/app/lib/authz', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/app/services/marksReviewWorkflow', () => ({
  listMarksWorkflowSettingsForAdmin: vi.fn(),
  updateMarksWorkflowSettingsForAdmin: vi.fn(),
}));

import { requireAdmin } from '@/app/lib/authz';
import {
  listMarksWorkflowSettingsForAdmin,
  updateMarksWorkflowSettingsForAdmin,
} from '@/app/services/marksReviewWorkflow';

function attachAudit(req: any) {
  req.audit = { log: vi.fn(async () => undefined) };
  return req;
}

describe('admin marks review workflow API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAdmin as any).mockResolvedValue({ userId: 'admin-1', roles: ['ADMIN'] });
    (listMarksWorkflowSettingsForAdmin as any).mockResolvedValue({
      ACADEMICS_BULK: { isActive: false },
      PT_BULK: { isActive: false },
    });
    (updateMarksWorkflowSettingsForAdmin as any).mockResolvedValue({
      ACADEMICS_BULK: { isActive: true },
      PT_BULK: { isActive: true },
    });
  });

  it('GET returns workflow settings', async () => {
    const req = attachAudit(makeJsonRequest({ method: 'GET', path: '/api/v1/admin/marks-review-workflow' }));
    const res = await GET(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.settings.ACADEMICS_BULK.isActive).toBe(false);
  });

  it('PUT updates workflow settings', async () => {
    const req = attachAudit(
      makeJsonRequest({
        method: 'PUT',
        path: '/api/v1/admin/marks-review-workflow',
        body: {
          ACADEMICS_BULK: {
            dataEntryUserIds: ['11111111-1111-4111-8111-111111111111'],
            verificationUserIds: ['22222222-2222-4222-8222-222222222222'],
            postVerificationOverrideMode: 'SUPER_ADMIN_ONLY',
          },
          PT_BULK: {
            dataEntryUserIds: ['33333333-3333-4333-8333-333333333333'],
            verificationUserIds: ['44444444-4444-4444-8444-444444444444'],
            postVerificationOverrideMode: 'ADMIN_AND_SUPER_ADMIN',
          },
        },
      }),
    );

    const res = await PUT(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.settings.PT_BULK.isActive).toBe(true);
    expect(updateMarksWorkflowSettingsForAdmin).toHaveBeenCalled();
  });

  it('returns 403 when admin auth fails', async () => {
    (requireAdmin as any).mockRejectedValueOnce(new ApiError(403, 'Forbidden', 'forbidden'));
    const req = attachAudit(makeJsonRequest({ method: 'GET', path: '/api/v1/admin/marks-review-workflow' }));
    const res = await GET(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('forbidden');
  });
});
