import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/app/lib/http';
import { GET, POST } from '@/app/api/v1/me/warning-notifications/route';
import { makeJsonRequest } from '../utils/next';

vi.mock('@/app/lib/authz', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/app/services/warningManagement', () => ({
  listMyWarningNotifications: vi.fn(),
  applyWarningNotificationAction: vi.fn(),
}));

import { requireAuth } from '@/app/lib/authz';
import {
  applyWarningNotificationAction,
  listMyWarningNotifications,
} from '@/app/services/warningManagement';

function attachAudit(req: any) {
  req.audit = { log: vi.fn(async () => undefined) };
  return req;
}

const authCtx = {
  userId: 'user-1',
  roles: ['PI_CDR'],
  claims: { apt: { id: 'appointment-1', position: 'PI Cdr' } },
};

describe('warning notifications API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(authCtx);
    (listMyWarningNotifications as any).mockResolvedValue([
      {
        id: 'pi-cdr-single-term:oc-1:Term-1',
        title: 'Warning notification',
        message: 'OC reached warning threshold.',
        ocId: 'oc-1',
        ocNo: '101',
        ocName: 'Arjun Singh',
        appointmentName: 'PI Cdr',
        triggerType: 'SINGLE_TERM',
        restrictionPoints: 10,
        actualPoints: 10,
        semesterLabel: 'Term 1',
        deepLink: '/dashboard/oc-1/milmgmt/discip-records',
        readAt: null,
        createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
      },
    ]);
    (applyWarningNotificationAction as any).mockResolvedValue([
      {
        id: 'pi-cdr-single-term:oc-1:Term-1',
        title: 'Warning notification',
        message: 'OC reached warning threshold.',
        ocId: 'oc-1',
        ocNo: '101',
        ocName: 'Arjun Singh',
        appointmentName: 'PI Cdr',
        triggerType: 'SINGLE_TERM',
        restrictionPoints: 10,
        actualPoints: 10,
        semesterLabel: 'Term 1',
        deepLink: '/dashboard/oc-1/milmgmt/discip-records',
        readAt: new Date('2026-01-01T01:00:00Z').toISOString(),
        createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
      },
    ]);
  });

  it('GET lists current appointment warning notifications', async () => {
    const req = attachAudit(makeJsonRequest({ method: 'GET', path: '/api/v1/me/warning-notifications' }));
    const res = await GET(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.unreadCount).toBe(1);
    expect(listMyWarningNotifications).toHaveBeenCalledWith(authCtx);
  });

  it('POST marks a warning notification as read', async () => {
    const payload = {
      action: 'MARK_AS_READ',
      notificationId: 'pi-cdr-single-term:oc-1:Term-1',
    };
    const req = attachAudit(
      makeJsonRequest({ method: 'POST', path: '/api/v1/me/warning-notifications', body: payload }),
    );
    const res = await POST(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.unreadCount).toBe(0);
    expect(applyWarningNotificationAction).toHaveBeenCalledWith(authCtx, payload);
  });

  it('returns 401 when current user auth fails', async () => {
    (requireAuth as any).mockRejectedValueOnce(new ApiError(401, 'Unauthorized', 'unauthorized'));
    const req = attachAudit(makeJsonRequest({ method: 'GET', path: '/api/v1/me/warning-notifications' }));
    const res = await GET(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('unauthorized');
  });
});
