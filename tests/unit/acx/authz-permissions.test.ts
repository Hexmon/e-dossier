import { describe, expect, it } from 'vitest';
import {
  applyAdminAndSuperAdminOverrides,
  getAdminBaselineActions,
  normalizeRoleSet,
} from '@/app/db/queries/authz-permissions';

describe('authz-permissions helpers', () => {
  it('normalizes role names to UPPER_SNAKE_CASE', () => {
    expect(normalizeRoleSet(['admin', 'super admin', 'hoat', 'PL CDR'])).toEqual(
      expect.arrayContaining(['ADMIN', 'SUPER_ADMIN', 'HOAT', 'PL_CDR'])
    );
  });

  it('applies admin baseline actions', () => {
    const permissionSet = new Set<string>();
    const result = applyAdminAndSuperAdminOverrides(['ADMIN'], permissionSet);
    const baseline = getAdminBaselineActions();

    expect(result.isAdmin).toBe(true);
    expect(result.isSuperAdmin).toBe(false);
    expect(permissionSet.size).toBeGreaterThan(0);
    expect(Array.from(permissionSet)).toEqual(expect.arrayContaining(baseline.slice(0, 3)));
    expect(Array.from(permissionSet)).toEqual(
      expect.arrayContaining([
        'page:dashboard:genmgmt:view',
        'page:dashboard:manage-marks:view',
      ])
    );
  });

  it('grants wildcard permission for super admin', () => {
    const permissionSet = new Set<string>();
    const result = applyAdminAndSuperAdminOverrides(['SUPER_ADMIN'], permissionSet);

    expect(result.isAdmin).toBe(true);
    expect(result.isSuperAdmin).toBe(true);
    expect(permissionSet.has('*')).toBe(true);
  });
});

