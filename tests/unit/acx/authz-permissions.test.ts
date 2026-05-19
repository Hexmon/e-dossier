import { describe, expect, it } from 'vitest';
import {
  applyPlatoonCommanderMarksEntryOverrides,
  applyAdminAndSuperAdminOverrides,
  applyInterviewPermissionFallbackOverrides,
  getAdminBaselineActions,
  normalizeRoleSet,
} from '@/app/db/queries/authz-permissions';
import { INTERVIEW_WRITE_PERMISSIONS } from '@/lib/interview-access';
import { getRbacDefaultProfiles } from '@/app/lib/rbac/default-permissions';

describe('authz-permissions helpers', () => {
  it('normalizes role names to UPPER_SNAKE_CASE', () => {
    expect(normalizeRoleSet(['admin', 'super admin', 'hoat', 'PL CDR'])).toEqual(
      expect.arrayContaining(['ADMIN', 'SUPER_ADMIN', 'HOAT', 'PL_CDR'])
    );
  });

  it('does not grant admin defaults invisibly', () => {
    const permissionSet = new Set<string>();
    const result = applyAdminAndSuperAdminOverrides(['ADMIN'], permissionSet);
    const baseline = getAdminBaselineActions();

    expect(result.isAdmin).toBe(true);
    expect(result.isSuperAdmin).toBe(false);
    expect(permissionSet.size).toBe(0);
    expect(baseline).toContain('page:dashboard:genmgmt:view');
  });

  it('grants wildcard permission for super admin', () => {
    const permissionSet = new Set<string>();
    const result = applyAdminAndSuperAdminOverrides(['SUPER_ADMIN'], permissionSet);

    expect(result.isAdmin).toBe(true);
    expect(result.isSuperAdmin).toBe(true);
    expect(permissionSet.has('*')).toBe(true);
  });

  it('exposes default permissions as configurable profiles', () => {
    const profiles = getRbacDefaultProfiles();
    const admin = profiles.find((profile) => profile.key === 'admin');
    const platoon = profiles.find((profile) => profile.key === 'platoon_commander');

    expect(admin?.permissionKeys).toContain('page:dashboard:genmgmt:view');
    expect(admin?.permissionKeys).toContain('admin:rbac:effective:read');
    expect(platoon?.permissionKeys).toContain('page:dashboard:manage-marks:view');
    expect(platoon?.permissionKeys).toContain('oc:physical-training:bulk:create');
  });

  it('recognizes platoon commanders without granting hidden permissions', () => {
    const permissionSet = new Set<string>();
    const result = applyPlatoonCommanderMarksEntryOverrides(['PLATOON_COMMANDER'], permissionSet);

    expect(result.isPlatoonCommander).toBe(true);
    expect(permissionSet.size).toBe(0);
  });

  it('does not grant commander marks permissions to legacy commander aliases', () => {
    const permissionSet = new Set<string>();
    const result = applyPlatoonCommanderMarksEntryOverrides(['PL_CDR'], permissionSet);

    expect(result.isPlatoonCommander).toBe(false);
    expect(permissionSet.size).toBe(0);
  });

  it('grants interview fallback permissions for platoon-specific PL CDR positions', () => {
    const permissionSet = new Set<string>();

    const result = applyInterviewPermissionFallbackOverrides(
      {
        roles: ['ARJUNPLCDR'],
        position: 'ARJUNPLCDR',
        scopeType: 'PLATOON',
      },
      permissionSet
    );

    expect(result.grantedPermissions).toEqual(
      expect.arrayContaining([
        INTERVIEW_WRITE_PERMISSIONS.initial.plcdr,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.shared,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.plcdr,
        INTERVIEW_WRITE_PERMISSIONS.term.postmid,
        INTERVIEW_WRITE_PERMISSIONS.term.special,
      ])
    );
    expect(permissionSet.has(INTERVIEW_WRITE_PERMISSIONS.initial.plcdr)).toBe(true);
  });
});
