import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { buildPrincipalFromRequest } from '@/app/lib/acx/principal';
import { getEffectivePermissionBundleCached } from '@/app/db/queries/authz-permissions';

vi.mock('@/app/lib/authz', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/app/db/queries/authz-permissions', () => ({
  getEffectivePermissionBundleCached: vi.fn(async () => ({
    userId: 'user-1',
    roles: ['HOAT'],
    appointment: {
      appointmentId: 'apt-1',
      positionId: 'pos-1',
      positionKey: 'HOAT',
      scopeType: 'PLATOON',
      scopeId: 'platoon-1',
    },
    isAdmin: false,
    isSuperAdmin: false,
    permissions: ['oc:academics:read'],
    deniedPermissions: [],
    fieldRulesByAction: {},
    policyVersion: 1,
  })),
}));

function makeRequest(url = 'http://localhost/api/v1/me'): Request {
  return new Request(url, { method: 'GET' });
}

describe('buildPrincipalFromRequest', () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset();
    vi.mocked(getEffectivePermissionBundleCached).mockClear();
  });

  it('maps auth claims to principal roles and attrs', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 'user-1',
      roles: ['hoat'],
      claims: {
        apt: {
          id: 'apt-1',
          position: 'PL_CDR',
          scope: {
            type: 'PLATOON',
            id: 'platoon-1',
          },
        },
      },
    } as Awaited<ReturnType<typeof requireAuth>>);

    const principal = await buildPrincipalFromRequest(makeRequest() as any);

    expect(principal.id).toBe('user-1');
    expect(principal.type).toBe('user');
    expect(principal.tenantId).toBe('platoon-1');
    expect(principal.roles).toEqual(expect.arrayContaining(['HOAT', 'PL_CDR']));
    expect(principal.attrs).toMatchObject({
      userId: 'user-1',
      appointmentId: 'apt-1',
      scopeType: 'PLATOON',
      scopeId: 'platoon-1',
      permissions: ['oc:academics:read'],
    });
  });

  it('derives admin roles from SUPER_ADMIN appointment', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 'user-2',
      roles: [],
      claims: {
        apt: {
          id: 'apt-2',
          position: 'SUPER_ADMIN',
          scope: {
            type: 'GLOBAL',
            id: null,
          },
        },
      },
    } as Awaited<ReturnType<typeof requireAuth>>);

    const principal = await buildPrincipalFromRequest(makeRequest() as any);

    expect(principal.roles).toEqual(expect.arrayContaining(['SUPER_ADMIN', 'ADMIN']));
    expect(principal.tenantId).toBe('scope:GLOBAL');
  });

  it('propagates auth failures', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new ApiError(401, 'Unauthorized', 'unauthorized'));

    await expect(buildPrincipalFromRequest(makeRequest() as any)).rejects.toBeInstanceOf(ApiError);
  });
});
