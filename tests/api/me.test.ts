import { describe, it, expect, vi } from 'vitest';
import { GET as getMe } from '@/app/api/v1/me/route';
import { makeJsonRequest, createRouteContext } from '../utils/next';
import { ApiError } from '@/app/lib/http';
import * as guard from '@/app/lib/guard';
import { db } from '@/app/db/client';
import { getEffectivePermissionBundleCached } from '@/app/db/queries/authz-permissions';

vi.mock('@/lib/audit-log', () => ({
  createAuditLog: vi.fn(async () => {}),
  logApiRequest: vi.fn(),
  ensureRequestContext: vi.fn(() => ({
    requestId: 'test',
    method: 'GET',
    pathname: '/',
    url: '/',
    startTime: Date.now(),
  })),
  noteRequestActor: vi.fn(),
  setRequestTenant: vi.fn(),
  AuditEventType: {
    API_REQUEST: 'api.request',
  },
  AuditResourceType: {
    USER: 'user',
  },
}));

vi.mock('@/app/lib/guard', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/app/services/marksReviewWorkflow', () => ({
  listMarksWorkflowAssignmentsForUser: vi.fn(async () => []),
  getWorkflowModuleSettings: vi.fn(async () => ({ isActive: false })),
}));

vi.mock('@/app/lib/module-access', () => ({
  resolveModuleAccessForUser: vi.fn(async () => ({
    canAccessDossier: false,
    canAccessBulkUpload: false,
    canAccessReports: false,
    canAccessAcademicsBulk: false,
    canAccessPtBulk: false,
  })),
}));

vi.mock('@/app/db/queries/authz-permissions', () => ({
  getEffectivePermissionBundleCached: vi.fn(async () => ({
    userId: 'user-1',
    roles: ['ADMIN'],
    appointment: {
      appointmentId: 'apt-1',
      positionId: 'pos-1',
      positionKey: 'ADMIN',
      scopeType: 'GLOBAL',
      scopeId: null,
    },
    isAdmin: true,
    isSuperAdmin: false,
    permissions: ['oc:interviews:initial:plcdr:update'],
    deniedPermissions: [],
    fieldRulesByAction: {},
    policyVersion: 7,
  })),
}));

vi.mock('@/app/db/client', () => {
  const select = vi.fn(() => ({
    from: () => ({
      where: async () => [
        {
          id: 'user-1',
          username: 'testuser',
          email: 'test@example.com',
          phone: '12345678',
          name: 'Test User',
          rank: 'OCT',
          currentAppointmentId: 'apt-1',
        },
      ],
    }),
  }));
  return { db: { select } };
});

const path = '/api/v1/me';

describe('GET /api/v1/me', () => {
  it('returns 401 when authentication fails', async () => {
    (guard.requireAuth as any).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );

    const req = makeJsonRequest({ method: 'GET', path });
    const res = await getMe(req as any, createRouteContext());

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns 404 when the user no longer exists', async () => {
    (guard.requireAuth as any).mockResolvedValueOnce({ userId: 'missing', roles: [] });
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({ where: async () => [] }),
    }));

    const req = makeJsonRequest({ method: 'GET', path });
    const res = await getMe(req as any, createRouteContext());

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('not_found');
  });

  it('returns current user profile on happy path', async () => {
    (guard.requireAuth as any).mockResolvedValueOnce({
      userId: 'user-1',
      roles: ['ADMIN'],
      apt: {
        id: 'apt-1',
        position: 'ADMIN',
        scope: {
          type: 'GLOBAL',
          id: null,
        },
      },
    });

    const req = makeJsonRequest({ method: 'GET', path });
    const res = await getMe(req as any, createRouteContext());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.user.id).toBe('user-1');
    expect(body.user.username).toBe('testuser');
    expect(body.roles).toContain('ADMIN');
    expect(body.apt).toEqual({
      id: 'apt-1',
      position: 'ADMIN',
      scope: {
        type: 'GLOBAL',
        id: null,
      },
    });
    expect(body.cadetAppointments).toEqual({
      canManage: false,
    });
    expect(body.moduleAccess).toEqual({
      canAccessDossier: false,
      canAccessBulkUpload: false,
      canAccessReports: false,
      canAccessAcademicsBulk: false,
      canAccessPtBulk: false,
    });
    expect(getEffectivePermissionBundleCached).toHaveBeenCalled();
    expect(body.permissions).toContain('oc:interviews:initial:plcdr:update');
    expect(body.policyVersion).toBe(7);
  });

  it('marks cadet appointments visible for platoon commander scoped identities', async () => {
    (guard.requireAuth as any).mockResolvedValueOnce({
      userId: 'user-1',
      roles: ['ARJUNPLCDR'],
      apt: {
        id: 'apt-1',
        position: 'ARJUNPLCDR',
        scope: {
          type: 'PLATOON',
          id: 'platoon-1',
        },
      },
    });

    const req = makeJsonRequest({ method: 'GET', path });
    const res = await getMe(req as any, createRouteContext());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cadetAppointments).toEqual({
      canManage: true,
    });
  });

  it('marks cadet appointments visible for dynamic platoon-cdr identities', async () => {
    (guard.requireAuth as any).mockResolvedValueOnce({
      userId: 'user-1',
      roles: ['chandragupt-platoon-cdr'],
      apt: {
        id: 'apt-1',
        position: 'chandragupt-platoon-cdr',
        scope: {
          type: 'PLATOON',
          id: 'platoon-1',
        },
      },
    });

    const req = makeJsonRequest({ method: 'GET', path });
    const res = await getMe(req as any, createRouteContext());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cadetAppointments).toEqual({
      canManage: true,
    });
  });
});
