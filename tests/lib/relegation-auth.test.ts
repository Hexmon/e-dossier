import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/lib/authz', () => ({
  hasAdminRole: vi.fn((roles: string[]) => roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')),
  requireAuth: vi.fn(),
}));

import { requireAuth } from '@/app/lib/authz';
import { getRelegationAccessContext } from '@/app/lib/relegation-auth';

describe('relegation auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows DC & CI appointment logins to write single OC relegations', async () => {
    (requireAuth as any).mockResolvedValue({
      userId: 'dcci-user',
      roles: [],
      claims: { apt: { position: 'DC & CI, MCEME' } },
    });

    const access = await getRelegationAccessContext({} as any);

    expect(access.isAdmin).toBe(false);
    expect(access.canWriteSingle).toBe(true);
    expect(access.canPromoteBatch).toBe(false);
  });

  it('keeps other non-admin appointments out of single OC relegation writes', async () => {
    (requireAuth as any).mockResolvedValue({
      userId: 'cdr-user',
      roles: [],
      claims: { apt: { position: 'CDR' } },
    });

    const access = await getRelegationAccessContext({} as any);

    expect(access.isAdmin).toBe(false);
    expect(access.canWriteSingle).toBe(false);
  });
});
