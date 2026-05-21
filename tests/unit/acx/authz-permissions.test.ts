import { describe, expect, it } from 'vitest';
import {
  applyPlatoonCommanderMarksEntryOverrides,
  applyAdminAndSuperAdminOverrides,
  applyInterviewPermissionFallbackOverrides,
  getAdminBaselineActions,
  normalizeRoleSet,
  resolveDefaultPermissionKeysForPosition,
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
    const otherUsers = profiles.find((profile) => profile.key === 'other_users');

    expect(admin?.permissionKeys).toContain('page:dashboard:genmgmt:view');
    expect(admin?.permissionKeys).toContain('admin:rbac:effective:read');
    expect(admin?.permissionKeys).toContain('page:dashboard:settings:device:view');
    expect(admin?.permissionKeys).toContain('page:dashboard:reports:view');
    expect(admin?.permissionKeys).not.toContain('page:dashboard:bulk-upload:view');
    expect(admin?.permissionKeys).not.toContain('sidebar:dossier');
    expect(admin?.permissionKeys).toContain('me:read');
    expect(admin?.permissionKeys).toContain('me:navigation:read');
    expect(admin?.permissionKeys).toContain('dashboard:data:course:read');
    expect(platoon?.permissionKeys).toContain('sidebar:dossier');
    expect(platoon?.permissionKeys).toContain('page:dashboard:milmgmt:physical-training:view');
    expect(platoon?.permissionKeys).toContain('page:dashboard:reports:view');
    expect(platoon?.permissionKeys).not.toContain('page:dashboard:bulk-upload:view');
    expect(platoon?.permissionKeys).not.toContain('oc:physical-training:bulk:create');
    expect(platoon?.permissionKeys).toContain('me:read');
    expect(platoon?.permissionKeys).toContain('me:navigation:read');
    expect(platoon?.positionKeys).toContain('PTN_CDR');
    expect(platoon?.roleKeys).toContain('ptn_cdr');
    expect(otherUsers?.permissionKeys).toContain('page:dashboard:bulk-upload:view');
    expect(otherUsers?.permissionKeys).toContain('admin:courses:read');
    expect(otherUsers?.permissionKeys).toContain('admin:courses:offerings:read');
    expect(otherUsers?.permissionKeys).toContain('admin:physical-training:types:read');
    expect(otherUsers?.permissionKeys).toContain('oc:physical-training:bulk:create');
    expect(otherUsers?.permissionKeys).toContain('oc:academics:workflow:update');
    expect(otherUsers?.permissionKeys).toContain('oc:physical-training:workflow:update');
    expect(otherUsers?.permissionKeys).toContain('page:dashboard:reports:view');
    expect(otherUsers?.permissionKeys).toContain('reports:academics:semester-grade:download:create');
    expect(otherUsers?.permissionKeys).toContain('sidebar:dossier');
    expect(otherUsers?.permissionKeys).toContain('page:dashboard:milmgmt:physical-training:view');
    expect(otherUsers?.permissionKeys).toContain('oc:physical-training:read');
    expect(otherUsers?.positionKeys).toContain('HOAT');
  });

  it('adds report support APIs to platoon defaults', () => {
    const profiles = getRbacDefaultProfiles();
    const platoon = profiles.find((profile) => profile.key === 'platoon_commander');

    expect(platoon?.permissionKeys).toContain('page:dashboard:reports:view');
    expect(platoon?.permissionKeys).toContain('admin:courses:read');
    expect(platoon?.permissionKeys).toContain('admin:courses:offerings:read');
    expect(platoon?.permissionKeys).toContain('admin:physical-training:types:read');
    expect(platoon?.permissionKeys).toContain('reports:mil-training:physical-assessment:preview:read');
  });

  it('resolves default permissions for custom appointment positions by role group', () => {
    const otherUserKeys = resolveDefaultPermissionKeysForPosition('TRAINING_OFFICER');
    const platoonKeys = resolveDefaultPermissionKeysForPosition('KARNA_PL_CDR');

    expect(otherUserKeys).toContain('page:dashboard:bulk-upload:view');
    expect(otherUserKeys).toContain('page:dashboard:reports:view');
    expect(otherUserKeys).toContain('sidebar:dossier');
    expect(platoonKeys).toContain('sidebar:dossier');
    expect(platoonKeys).toContain('page:dashboard:reports:view');
    expect(platoonKeys).not.toContain('page:dashboard:bulk-upload:view');
    expect(resolveDefaultPermissionKeysForPosition('ADMIN')).toEqual([]);
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
