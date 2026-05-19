import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDbSelect = vi.hoisted(() => vi.fn());

import { ApiError } from '@/app/lib/http';
import { makeJsonRequest, createRouteContext } from '../utils/next';
import { GET as getPermissions, POST as postPermission } from '@/app/api/v1/admin/rbac/permissions/route';
import {
  PATCH as patchPermission,
  DELETE as deletePermission,
} from '@/app/api/v1/admin/rbac/permissions/[permissionId]/route';
import { GET as getMappings, PUT as putMappings } from '@/app/api/v1/admin/rbac/mappings/route';
import { GET as getEffective } from '@/app/api/v1/admin/rbac/effective/route';
import { GET as getRoles, POST as postRole } from '@/app/api/v1/admin/rbac/roles/route';
import { PATCH as patchRole, DELETE as deleteRole } from '@/app/api/v1/admin/rbac/roles/[roleId]/route';
import { GET as getFieldRules, POST as postFieldRule } from '@/app/api/v1/admin/rbac/field-rules/route';
import { PATCH as patchFieldRule } from '@/app/api/v1/admin/rbac/field-rules/[ruleId]/route';

import * as authz from '@/app/lib/authz';
import * as rbacAdminQueries from '@/app/db/queries/rbac-admin';
import * as authzPermissions from '@/app/db/queries/authz-permissions';

vi.mock('@/app/lib/authz', () => ({
  requireAdmin: vi.fn(),
  requireAuth: vi.fn(),
}));

vi.mock('@/app/db/client', () => ({
  db: {
    select: mockDbSelect,
  },
}));

vi.mock('@/app/db/queries/rbac-admin', () => ({
  listRbacPermissions: vi.fn(async () => []),
  createRbacPermission: vi.fn(async (input: { key: string; description?: string | null }) => ({
    id: 'perm-1',
    key: input.key,
    description: input.description ?? null,
    system: false,
    defaultGrant: false,
    display: {
      title: input.key,
      moduleLabel: 'Custom',
      areaLabel: 'Custom',
      actionLabel: 'Custom',
      description: input.description ?? input.key,
    },
  })),
  updateRbacPermission: vi.fn(async (permissionId: string, input: { key?: string; description?: string | null }) => ({
    id: permissionId,
    key: input.key ?? 'custom:rbac:test',
    description: input.description ?? null,
    system: false,
    defaultGrant: false,
    display: {
      title: input.key ?? 'custom:rbac:test',
      moduleLabel: 'Custom',
      areaLabel: 'Custom',
      actionLabel: 'Custom',
      description: input.description ?? 'Custom test permission',
    },
  })),
  deleteRbacPermission: vi.fn(async (permissionId: string) => ({
    id: permissionId,
    key: 'custom:rbac:test',
  })),
  createRbacRole: vi.fn(async (input: { key: string; description?: string | null }) => ({
    id: 'role-2',
    key: input.key,
    description: input.description ?? null,
  })),
  getRbacRoleById: vi.fn(async () => ({ id: 'role-2', key: 'hoat', description: 'HOAT' })),
  updateRbacRole: vi.fn(async (roleId: string, input: { key?: string; description?: string | null }) => ({
    id: roleId,
    key: input.key ?? 'hoat',
    description: input.description ?? 'Updated HOAT',
  })),
  deleteRbacRole: vi.fn(async (roleId: string) => ({ id: roleId, key: 'hoat' })),
  listRbacRoles: vi.fn(async () => [{ id: 'role-1', key: 'admin', description: 'Admin' }]),
  listRbacPositions: vi.fn(async () => [{ id: 'pos-1', key: 'ADMIN', displayName: 'Admin' }]),
  listRolePermissionMappings: vi.fn(async () => []),
  listPositionPermissionMappings: vi.fn(async () => []),
  getRbacDefaultMappingMetadata: vi.fn(async () => ({
    defaultProfiles: [
      {
        key: 'admin',
        label: 'Admin',
        roleKeys: ['admin'],
        positionKeys: ['ADMIN'],
        permissionKeys: ['admin:rbac:mappings:read'],
      },
    ],
    defaultRoleMappings: [
      {
        profileKey: 'admin',
        roleId: 'role-1',
        roleKey: 'admin',
        permissionId: 'perm-1',
        permissionKey: 'admin:rbac:mappings:read',
      },
    ],
    defaultPositionMappings: [],
    permissionMeta: [],
  })),
  setRolePermissionMappings: vi.fn(async () => undefined),
  setPositionPermissionMappings: vi.fn(async () => undefined),
  listFieldRules: vi.fn(async () => []),
  createFieldRule: vi.fn(async () => ({
    id: 'rule-1',
    permissionId: 'perm-1',
    positionId: 'pos-1',
    roleId: null,
    mode: 'OMIT',
    fields: ['score'],
    note: null,
  })),
  updateFieldRule: vi.fn(async (ruleId: string) => ({
    id: ruleId,
    permissionId: 'perm-1',
    positionId: 'pos-1',
    roleId: null,
    mode: 'OMIT',
    fields: ['score'],
    note: null,
  })),
  deleteFieldRule: vi.fn(async (ruleId: string) => ({
    id: ruleId,
    permissionId: 'perm-1',
  })),
}));

vi.mock('@/app/db/queries/authz-permissions', () => ({
  getEffectivePermissionBundleCached: vi.fn(async () => ({
    userId: 'admin-1',
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
    permissions: ['admin:rbac:mappings:read'],
    deniedPermissions: [],
    fieldRulesByAction: {},
    policyVersion: 2,
  })),
}));

const basePermissionsPath = '/api/v1/admin/rbac/permissions';

function mockSelectRows(rows: unknown[]) {
  return {
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve(rows),
      }),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDbSelect.mockImplementation(() => mockSelectRows([{ id: 'row-1' }]));
  vi.mocked(authz.requireAuth).mockResolvedValue({
    userId: 'admin-1',
    roles: ['ADMIN'],
    claims: {},
  } as Awaited<ReturnType<typeof authz.requireAuth>>);
  vi.mocked(authz.requireAdmin).mockResolvedValue({
    userId: 'admin-1',
    roles: ['ADMIN'],
    claims: {},
  } as Awaited<ReturnType<typeof authz.requireAdmin>>);
});

describe('RBAC permissions routes', () => {
  it('GET /api/v1/admin/rbac/permissions returns 401 when auth fails', async () => {
    vi.mocked(authz.requireAdmin).mockRejectedValueOnce(new ApiError(401, 'Unauthorized', 'unauthorized'));

    const req = makeJsonRequest({ method: 'GET', path: basePermissionsPath });
    const res = await getPermissions(req as any, createRouteContext());

    expect(res.status).toBe(401);
  });

  it('GET /api/v1/admin/rbac/permissions returns items', async () => {
    vi.mocked(rbacAdminQueries.listRbacPermissions).mockResolvedValueOnce([
      {
        id: 'perm-1',
        key: 'admin:rbac:permissions:read',
        description: null,
        system: true,
        defaultGrant: true,
        display: {
          title: 'Read RBAC permissions',
          moduleLabel: 'Admin',
          areaLabel: 'RBAC',
          actionLabel: 'Read',
          description: 'Read RBAC permissions',
        },
      },
    ]);

    const req = makeJsonRequest({
      method: 'GET',
      path: `${basePermissionsPath}?q=rbac&limit=5&offset=0`,
    });
    const res = await getPermissions(req as any, createRouteContext());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      system: true,
      defaultGrant: true,
      display: {
        title: 'Read RBAC permissions',
      },
    });
    expect(rbacAdminQueries.listRbacPermissions).toHaveBeenCalledWith({ q: 'rbac', limit: 5, offset: 0 });
  });

  it('POST /api/v1/admin/rbac/permissions validates payload', async () => {
    const req = makeJsonRequest({ method: 'POST', path: basePermissionsPath, body: { key: '' } });
    const res = await postPermission(req as any, createRouteContext());

    expect(res.status).toBe(400);
  });

  it('POST /api/v1/admin/rbac/permissions creates permission', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: basePermissionsPath,
      body: { key: 'custom:reports:export', description: 'Custom report export permission' },
    });

    const res = await postPermission(req as any, createRouteContext());

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.permission.key).toBe('custom:reports:export');
    expect(body.permission.system).toBe(false);
  });

  it('POST /api/v1/admin/rbac/permissions rejects manually creating system permissions', async () => {
    vi.mocked(rbacAdminQueries.createRbacPermission).mockRejectedValueOnce(
      new ApiError(
        403,
        'System permissions are managed by the action map and cannot be created manually.',
        'system_permission_immutable'
      )
    );
    const req = makeJsonRequest({
      method: 'POST',
      path: basePermissionsPath,
      body: { key: 'admin:rbac:permissions:create', description: 'Create RBAC permissions' },
    });

    const res = await postPermission(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('system_permission_immutable');
  });

  it('PATCH /api/v1/admin/rbac/permissions/:permissionId updates permission', async () => {
    const req = makeJsonRequest({
      method: 'PATCH',
      path: `${basePermissionsPath}/perm-1`,
      body: { description: 'Updated' },
    });

    const res = await patchPermission(req as any, createRouteContext({ permissionId: 'perm-1' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.permission.id).toBe('perm-1');
  });

  it('PATCH /api/v1/admin/rbac/permissions/:permissionId rejects system permission updates', async () => {
    vi.mocked(rbacAdminQueries.updateRbacPermission).mockRejectedValueOnce(
      new ApiError(
        403,
        'System permissions are managed by the action map and cannot be edited.',
        'system_permission_immutable'
      )
    );
    const req = makeJsonRequest({
      method: 'PATCH',
      path: `${basePermissionsPath}/perm-system`,
      body: { description: 'Renamed system permission' },
    });

    const res = await patchPermission(req as any, createRouteContext({ permissionId: 'perm-system' }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('system_permission_immutable');
  });

  it('DELETE /api/v1/admin/rbac/permissions/:permissionId returns 404 when missing', async () => {
    vi.mocked(rbacAdminQueries.deleteRbacPermission).mockResolvedValueOnce(undefined as never);

    const req = makeJsonRequest({ method: 'DELETE', path: `${basePermissionsPath}/perm-missing` });
    const res = await deletePermission(req as any, createRouteContext({ permissionId: 'perm-missing' }));

    expect(res.status).toBe(404);
  });

  it('DELETE /api/v1/admin/rbac/permissions/:permissionId rejects system permissions', async () => {
    vi.mocked(rbacAdminQueries.deleteRbacPermission).mockRejectedValueOnce(
      new ApiError(
        403,
        'System permissions are managed by the action map and cannot be deleted.',
        'system_permission_immutable'
      )
    );

    const req = makeJsonRequest({ method: 'DELETE', path: `${basePermissionsPath}/perm-system` });
    const res = await deletePermission(req as any, createRouteContext({ permissionId: 'perm-system' }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('system_permission_immutable');
  });

  it('DELETE /api/v1/admin/rbac/permissions/:permissionId deletes custom permissions', async () => {
    vi.mocked(rbacAdminQueries.deleteRbacPermission).mockResolvedValueOnce({
      id: 'perm-custom',
      key: 'custom:reports:export',
    });

    const req = makeJsonRequest({ method: 'DELETE', path: `${basePermissionsPath}/perm-custom` });
    const res = await deletePermission(req as any, createRouteContext({ permissionId: 'perm-custom' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.permission.key).toBe('custom:reports:export');
  });

  it('GET /api/v1/admin/rbac/permissions returns 403 for non-admin', async () => {
    vi.mocked(authz.requireAdmin).mockRejectedValueOnce(
      new ApiError(403, 'Admin privileges required', 'forbidden')
    );

    const req = makeJsonRequest({ method: 'GET', path: basePermissionsPath });
    const res = await getPermissions(req as any, createRouteContext());

    expect(res.status).toBe(403);
  });
});

describe('RBAC mappings, roles, and field rules routes', () => {
  it('GET /api/v1/admin/rbac/mappings returns role and position mappings', async () => {
    const req = makeJsonRequest({ method: 'GET', path: '/api/v1/admin/rbac/mappings' });
    const res = await getMappings(req as any, createRouteContext());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.roles).toHaveLength(1);
    expect(body.positions).toHaveLength(1);
    expect(body.defaults.defaultRoleMappings[0].permissionKey).toBe('admin:rbac:mappings:read');
  });

  it('PUT /api/v1/admin/rbac/mappings validates payload requirements', async () => {
    const req = makeJsonRequest({
      method: 'PUT',
      path: '/api/v1/admin/rbac/mappings',
      body: { permissionIds: [] },
    });
    const res = await putMappings(req as any, createRouteContext());

    expect(res.status).toBe(400);
  });

  it('PUT /api/v1/admin/rbac/mappings updates role mappings', async () => {
    const req = makeJsonRequest({
      method: 'PUT',
      path: '/api/v1/admin/rbac/mappings',
      body: { roleId: '11111111-1111-4111-8111-111111111111', permissionIds: ['22222222-2222-4222-8222-222222222222'] },
    });
    const res = await putMappings(req as any, createRouteContext());

    expect(res.status).toBe(200);
    expect(rbacAdminQueries.setRolePermissionMappings).toHaveBeenCalledTimes(1);
  });

  it('GET /api/v1/admin/rbac/roles returns roles and positions', async () => {
    const req = makeJsonRequest({ method: 'GET', path: '/api/v1/admin/rbac/roles' });
    const res = await getRoles(req as any, createRouteContext());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.roles[0].id).toBe('role-1');
  });

  it('GET /api/v1/admin/rbac/effective returns effective access preview', async () => {
    const req = makeJsonRequest({
      method: 'GET',
      path: '/api/v1/admin/rbac/effective?userId=admin-1&appointmentId=apt-1',
    });
    const res = await getEffective(req as any, createRouteContext());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bundle.permissions).toContain('admin:rbac:mappings:read');
    expect(authzPermissions.getEffectivePermissionBundleCached).toHaveBeenCalledWith({
      userId: 'admin-1',
      roles: ['ADMIN'],
      apt: { id: 'apt-1' },
    });
  });

  it('GET /api/v1/admin/rbac/effective returns 404 for invalid user/appointment combinations', async () => {
    mockDbSelect
      .mockReturnValueOnce(mockSelectRows([{ id: 'admin-1' }]))
      .mockReturnValueOnce(mockSelectRows([]));
    const req = makeJsonRequest({
      method: 'GET',
      path: '/api/v1/admin/rbac/effective?userId=admin-1&appointmentId=foreign-apt',
    });

    const res = await getEffective(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('not_found');
    expect(authzPermissions.getEffectivePermissionBundleCached).not.toHaveBeenCalled();
  });

  it('GET /api/v1/admin/rbac/effective returns 404 when the target user is missing', async () => {
    mockDbSelect.mockReturnValueOnce(mockSelectRows([]));
    const req = makeJsonRequest({
      method: 'GET',
      path: '/api/v1/admin/rbac/effective?userId=missing-user',
    });

    const res = await getEffective(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('not_found');
    expect(authzPermissions.getEffectivePermissionBundleCached).not.toHaveBeenCalled();
  });

  it('POST /api/v1/admin/rbac/roles validates payload', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/admin/rbac/roles',
      body: { key: '' },
    });

    const res = await postRole(req as any, createRouteContext());
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/admin/rbac/roles creates role', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/admin/rbac/roles',
      body: { key: 'hoat', description: 'HOAT role' },
    });
    const res = await postRole(req as any, createRouteContext());

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.role.key).toBe('hoat');
  });

  it('PATCH /api/v1/admin/rbac/roles/:roleId updates role', async () => {
    const req = makeJsonRequest({
      method: 'PATCH',
      path: '/api/v1/admin/rbac/roles/role-2',
      body: { description: 'Updated HOAT' },
    });
    const res = await patchRole(req as any, createRouteContext({ roleId: 'role-2' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role.id).toBe('role-2');
  });

  it('DELETE /api/v1/admin/rbac/roles/:roleId rejects immutable roles', async () => {
    vi.mocked(rbacAdminQueries.getRbacRoleById).mockResolvedValueOnce({
      id: 'role-1',
      key: 'admin',
      description: 'Admin',
    });

    const req = makeJsonRequest({ method: 'DELETE', path: '/api/v1/admin/rbac/roles/role-1' });
    const res = await deleteRole(req as any, createRouteContext({ roleId: 'role-1' }));

    expect(res.status).toBe(403);
  });

  it('GET /api/v1/admin/rbac/field-rules returns field rules', async () => {
    vi.mocked(rbacAdminQueries.listFieldRules).mockResolvedValueOnce([
      {
        id: 'rule-1',
        permissionId: 'perm-1',
        permissionKey: 'admin:rbac:permissions:update',
        positionId: 'pos-1',
        positionKey: 'ADMIN',
        roleId: null,
        roleKey: null,
        mode: 'OMIT',
        fields: ['description'],
        note: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const req = makeJsonRequest({ method: 'GET', path: '/api/v1/admin/rbac/field-rules' });
    const res = await getFieldRules(req as any, createRouteContext());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
  });

  it('POST /api/v1/admin/rbac/field-rules validates payload', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/admin/rbac/field-rules',
      body: {
        permissionId: '11111111-1111-4111-8111-111111111111',
        mode: 'OMIT',
        fields: ['score'],
      },
    });

    const res = await postFieldRule(req as any, createRouteContext());

    expect(res.status).toBe(400);
  });

  it('POST /api/v1/admin/rbac/field-rules rejects rules scoped to both role and position', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/admin/rbac/field-rules',
      body: {
        permissionId: '11111111-1111-4111-8111-111111111111',
        positionId: '22222222-2222-4222-8222-222222222222',
        roleId: '33333333-3333-4333-8333-333333333333',
        mode: 'OMIT',
        fields: ['score'],
      },
    });

    const res = await postFieldRule(req as any, createRouteContext());

    expect(res.status).toBe(400);
  });

  it('PATCH /api/v1/admin/rbac/field-rules/:ruleId rejects updates that remove rule scope', async () => {
    vi.mocked(rbacAdminQueries.updateFieldRule).mockRejectedValueOnce(
      new ApiError(
        400,
        'Exactly one of positionId or roleId is required for a field rule.',
        'bad_request'
      )
    );
    const req = makeJsonRequest({
      method: 'PATCH',
      path: '/api/v1/admin/rbac/field-rules/rule-1',
      body: { positionId: null },
    });

    const res = await patchFieldRule(req as any, createRouteContext({ ruleId: 'rule-1' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('bad_request');
  });
});
