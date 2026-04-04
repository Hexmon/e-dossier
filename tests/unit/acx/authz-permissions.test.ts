import { describe, expect, it } from 'vitest';
import {
  applyPlatoonCommanderMarksEntryOverrides,
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
    expect(Array.from(permissionSet)).toContain('page:dashboard:genmgmt:view');
    expect(Array.from(permissionSet)).not.toContain('page:dashboard:manage-marks:view');
    expect(Array.from(permissionSet)).not.toContain('oc:academics:bulk:read');
  });

  it('grants wildcard permission for super admin', () => {
    const permissionSet = new Set<string>();
    const result = applyAdminAndSuperAdminOverrides(['SUPER_ADMIN'], permissionSet);

    expect(result.isAdmin).toBe(true);
    expect(result.isSuperAdmin).toBe(true);
    expect(permissionSet.has('*')).toBe(true);
  });

  it('grants default manage-marks and manage-pt permissions to platoon commanders', () => {
    const permissionSet = new Set<string>();
    const result = applyPlatoonCommanderMarksEntryOverrides(['PLATOON_COMMANDER'], permissionSet);

    expect(result.isPlatoonCommander).toBe(true);
    expect(permissionSet.has('page:dashboard:manage-marks:view')).toBe(true);
    expect(permissionSet.has('page:dashboard:manage-pt-marks:view')).toBe(true);
    expect(permissionSet.has('page:dashboard:milmgmt:academics:view')).toBe(true);
    expect(permissionSet.has('page:dashboard:milmgmt:physical-training:view')).toBe(true);
    expect(permissionSet.has('admin:physical-training:templates:read')).toBe(true);
    expect(permissionSet.has('oc:academics:read')).toBe(true);
    expect(permissionSet.has('oc:physical-training:read')).toBe(true);
    expect(permissionSet.has('oc:physical-training:motivation-awards:read')).toBe(true);
    expect(permissionSet.has('oc:academics:bulk:create')).toBe(true);
    expect(permissionSet.has('oc:physical-training:bulk:create')).toBe(true);
  });
});
