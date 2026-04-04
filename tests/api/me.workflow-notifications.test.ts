import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/app/lib/http';
import { GET, POST } from '@/app/api/v1/me/workflow-notifications/route';
import { makeJsonRequest } from '../utils/next';

vi.mock('@/app/lib/authz', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/app/services/marksReviewWorkflow', () => ({
  listMyWorkflowNotifications: vi.fn(),
  applyWorkflowNotificationAction: vi.fn(),
}));

import { requireAuth } from '@/app/lib/authz';
import {
  listMyWorkflowNotifications,
  applyWorkflowNotificationAction,
} from '@/app/services/marksReviewWorkflow';

function attachAudit(req: any) {
  req.audit = { log: vi.fn(async () => undefined) };
  return req;
}

describe('workflow notifications API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue({ userId: 'user-1', roles: ['ADMIN'] });
    (listMyWorkflowNotifications as any).mockResolvedValue([
      {
        id: '11111111-1111-4111-8111-111111111111',
        module: 'ACADEMICS_BULK',
        workflowStatus: 'PENDING_VERIFICATION',
        selectionLabel: 'Course / Semester / Subject',
        message: 'Submitted for verification.',
        deepLink: '/dashboard/manage-marks?courseId=1&semester=1&subjectId=1',
        readAt: null,
        createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
        actor: null,
      },
    ]);
    (applyWorkflowNotificationAction as any).mockResolvedValue([
      {
        id: '11111111-1111-4111-8111-111111111111',
        module: 'ACADEMICS_BULK',
        workflowStatus: 'PENDING_VERIFICATION',
        selectionLabel: 'Course / Semester / Subject',
        message: 'Submitted for verification.',
        deepLink: '/dashboard/manage-marks?courseId=1&semester=1&subjectId=1',
        readAt: new Date('2026-01-01T01:00:00Z').toISOString(),
        createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
        actor: null,
      },
    ]);
  });

  it('GET lists current user notifications', async () => {
    const req = attachAudit(makeJsonRequest({ method: 'GET', path: '/api/v1/me/workflow-notifications' }));
    const res = await GET(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.unreadCount).toBe(1);
  });

  it('POST marks notifications as read', async () => {
    const req = attachAudit(
      makeJsonRequest({
        method: 'POST',
        path: '/api/v1/me/workflow-notifications',
        body: {
          action: 'MARK_AS_READ',
          notificationId: '11111111-1111-4111-8111-111111111111',
        },
      }),
    );
    const res = await POST(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.unreadCount).toBe(0);
  });

  it('returns 401 when current user auth fails', async () => {
    (requireAuth as any).mockRejectedValueOnce(new ApiError(401, 'Unauthorized', 'unauthorized'));
    const req = attachAudit(makeJsonRequest({ method: 'GET', path: '/api/v1/me/workflow-notifications' }));
    const res = await GET(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('unauthorized');
  });
});
