import { api } from '@/app/lib/apiClient';

export type RbacPermission = {
  id: string;
  key: string;
  description: string | null;
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
};

export const rbacApi = {
  listPermissions: async (params?: { q?: string; limit?: number; offset?: number }) => {
    return api.get<{ message: string; items: RbacPermission[]; count: number }>(
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
    }>('/api/v1/admin/rbac/mappings', { query: params });
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
    return api.get<{ message: string; items: FieldRule[]; count: number }>('/api/v1/admin/rbac/field-rules', {
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
