import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as getActiveUser } from '@/app/api/v1/appointments/[id]/active-user/route';
import { makeJsonRequest, createRouteContext } from '../utils/next';

import * as appointmentsQueries from '@/app/db/queries/appointments';

const auditLogMock = vi.fn(async () => undefined);

vi.mock('@/lib/audit', () => ({
  withAuditRoute: (_method: string, handler: any) => {
    return (req: any, context: any) => {
      req.audit = { log: auditLogMock };
      return handler(req, context);
    };
  },
  AuditEventType: {
    API_REQUEST: 'ACCESS.REQUEST',
  },
  AuditResourceType: {
    APPOINTMENT: 'appointment',
  },
}));

vi.mock('@/app/db/queries/appointments', () => ({
  getActiveAppointmentWithHolder: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/appointments/[id]/active-user', () => {
  it('returns 404 when the appointment has no active holder', async () => {
    vi.mocked(appointmentsQueries.getActiveAppointmentWithHolder).mockResolvedValueOnce(null);

    const req = makeJsonRequest({
      method: 'GET',
      path: '/api/v1/appointments/11111111-1111-4111-8111-111111111111/active-user',
    });

    const res = await getActiveUser(
      req as any,
      createRouteContext({ id: '11111111-1111-4111-8111-111111111111' }),
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('not_found');
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'FAILURE',
        target: { type: 'appointment', id: '11111111-1111-4111-8111-111111111111' },
      }),
    );
  });

  it('returns the active holder when found', async () => {
    vi.mocked(appointmentsQueries.getActiveAppointmentWithHolder).mockResolvedValueOnce({
      id: '11111111-1111-4111-8111-111111111111',
      userId: 'user-1',
      username: 'testuser',
      positionKey: 'ADMIN',
      scopeType: 'GLOBAL',
      scopeId: null,
      startsAt: new Date().toISOString(),
      endsAt: null,
      passwordUpdatedAt: null,
    } as Awaited<ReturnType<typeof appointmentsQueries.getActiveAppointmentWithHolder>>);

    const req = makeJsonRequest({
      method: 'GET',
      path: '/api/v1/appointments/11111111-1111-4111-8111-111111111111/active-user',
    });

    const res = await getActiveUser(
      req as any,
      createRouteContext({ id: '11111111-1111-4111-8111-111111111111' }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe('Active appointment holder retrieved successfully.');
    expect(body.user_id).toBe('user-1');
    expect(body.username).toBe('testuser');
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'SUCCESS',
        metadata: expect.objectContaining({ userId: 'user-1' }),
      }),
    );
  });
});
