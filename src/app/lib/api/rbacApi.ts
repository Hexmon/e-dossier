import { api } from '@/app/lib/apiClient';

export type RbacPermission = {
  id: string;
  key: string;
  description: string | null;
  system?: boolean;
  defaultGrant?: boolean;
  display?: {
    title: string;
    moduleLabel: string;
    areaLabel: string;
    actionLabel: string;
    description: string;
  };
};

export type RbacPermissionPage = {
  message: string;
  items: RbacPermission[];
  count: number;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export type RbacRole = {
  id: string;
  key: string;
  description: string | null;
};

export type RbacPosition = {
  id: string;
  key: string;
  displayName: string | null;
};

export type RolePermissionMapping = {
  roleId: string;
  roleKey: string;
  permissionId: string;
  permissionKey: string;
};

export type PositionPermissionMapping = {
  positionId: string;
  positionKey: string;
  permissionId: string;
  permissionKey: string;
};

export type RbacDefaultProfile = {
  key: string;
  label: string;
  roleKeys: string[];
  positionKeys: string[];
  permissionKeys: string[];
  protected?: boolean;
};

export type RbacDefaultRoleMapping = RolePermissionMapping & {
  profileKey: string;
};

export type RbacDefaultPositionMapping = PositionPermissionMapping & {
  profileKey: string;
};

export type RbacPermissionDisplayMeta = {
  permissionId: string;
  permissionKey: string;
  title: string;
  moduleLabel: string;
  areaLabel: string;
  actionLabel: string;
  description: string;
};

export type FieldRule = {
  id: string;
  permissionId: string;
  permissionKey: string;
  positionId: string | null;
  positionKey: string | null;
  roleId: string | null;
  roleKey: string | null;
  mode: 'ALLOW' | 'DENY' | 'OMIT' | 'MASK';
  fields: string[];
  note: string | null;
  createdAt: string;
  updatedAt: string;
  defaultRule?: boolean;
  customRule?: boolean;
};

export type RbacDefaultFieldRule = {
  key: string;
  label: string;
  permissionKey: string;
  roleKeys: string[];
  positionKeys: string[];
  mode: 'ALLOW' | 'DENY' | 'OMIT' | 'MASK';
  fields: string[];
  note?: string | null;
};

export type RbacFieldRuleDefaults = {
  defaultFieldRules: RbacDefaultFieldRule[];
  missingDefaultFieldRules: RbacDefaultFieldRule[];
};

export type EffectiveRbacBundle = {
  userId: string;
  roles: string[];
  appointment: {
    appointmentId: string | null;
    positionId: string | null;
    positionKey: string | null;
    scopeType: string | null;
    scopeId: string | null;
  };
  isAdmin: boolean;
  isSuperAdmin: boolean;
  permissions: string[];
  deniedPermissions: string[];
  fieldRulesByAction: Record<string, unknown[]>;
  policyVersion: number;
};

export const rbacApi = {
  listPermissions: async (params?: { q?: string; limit?: number; offset?: number }) => {
    return api.get<RbacPermissionPage>(
      '/api/v1/admin/rbac/permissions',
      { query: params }
    );
  },

  createPermission: async (input: { key: string; description?: string | null }) => {
    return api.post<{ message: string; permission: RbacPermission }, typeof input>(
      '/api/v1/admin/rbac/permissions',
      input
    );
  },

  updatePermission: async (permissionId: string, input: { key?: string; description?: string | null }) => {
    return api.patch<{ message: string; permission: RbacPermission }, typeof input>(
      `/api/v1/admin/rbac/permissions/${permissionId}`,
      input
    );
  },

  deletePermission: async (permissionId: string) => {
    return api.delete<{ message: string; permission: Pick<RbacPermission, 'id' | 'key'> }>(
      `/api/v1/admin/rbac/permissions/${permissionId}`
    );
  },

  listRolesAndPositions: async () => {
    return api.get<{ message: string; roles: RbacRole[]; positions: RbacPosition[] }>(
      '/api/v1/admin/rbac/roles'
    );
  },

  createRole: async (input: { key: string; description?: string | null }) => {
    return api.post<{ message: string; role: RbacRole }, typeof input>(
      '/api/v1/admin/rbac/roles',
      input
    );
  },

  updateRole: async (roleId: string, input: { key?: string; description?: string | null }) => {
    return api.patch<{ message: string; role: RbacRole }, typeof input>(
      `/api/v1/admin/rbac/roles/${roleId}`,
      input
    );
  },

  deleteRole: async (roleId: string) => {
    return api.delete<{ message: string; role: Pick<RbacRole, 'id' | 'key'> }>(
      `/api/v1/admin/rbac/roles/${roleId}`
    );
  },

  listMappings: async (params?: { roleId?: string; positionId?: string }) => {
    return api.get<{
      message: string;
      roles: RbacRole[];
      positions: RbacPosition[];
      roleMappings: RolePermissionMapping[];
      positionMappings: PositionPermissionMapping[];
      defaults: {
        defaultProfiles: RbacDefaultProfile[];
        defaultRoleMappings: RbacDefaultRoleMapping[];
        defaultPositionMappings: RbacDefaultPositionMapping[];
        permissionMeta: RbacPermissionDisplayMeta[];
      };
    }>('/api/v1/admin/rbac/mappings', { query: params });
  },

  getEffectivePermissions: async (params?: { userId?: string; appointmentId?: string }) => {
    return api.get<{ message: string; bundle: EffectiveRbacBundle }>('/api/v1/admin/rbac/effective', {
      query: params,
    });
  },

  setRoleMappings: async (input: { roleId: string; permissionIds: string[] }) => {
    return api.put<{ message: string; roleId: string; permissionIds: string[] }, typeof input>(
      '/api/v1/admin/rbac/mappings',
      input
    );
  },

  setPositionMappings: async (input: { positionId: string; permissionIds: string[] }) => {
    return api.put<{ message: string; positionId: string; permissionIds: string[] }, typeof input>(
      '/api/v1/admin/rbac/mappings',
      input
    );
  },

  listFieldRules: async (params?: { permissionId?: string; positionId?: string; roleId?: string }) => {
    return api.get<{ message: string; items: FieldRule[]; count: number; defaults: RbacFieldRuleDefaults }>('/api/v1/admin/rbac/field-rules', {
      query: params,
    });
  },

  createFieldRule: async (input: {
    permissionId: string;
    positionId?: string | null;
    roleId?: string | null;
    mode: 'ALLOW' | 'DENY' | 'OMIT' | 'MASK';
    fields?: string[];
    note?: string | null;
  }) => {
    return api.post<{ message: string; rule: FieldRule }, typeof input>('/api/v1/admin/rbac/field-rules', input);
  },

  updateFieldRule: async (
    ruleId: string,
    input: {
      positionId?: string | null;
      roleId?: string | null;
      mode?: 'ALLOW' | 'DENY' | 'OMIT' | 'MASK';
      fields?: string[];
      note?: string | null;
    }
  ) => {
    return api.patch<{ message: string; rule: FieldRule }, typeof input>(
      `/api/v1/admin/rbac/field-rules/${ruleId}`,
      input
    );
  },

  deleteFieldRule: async (ruleId: string) => {
    return api.delete<{ message: string; rule: Pick<FieldRule, 'id' | 'permissionId'> }>(
      `/api/v1/admin/rbac/field-rules/${ruleId}`
    );
  },
};
