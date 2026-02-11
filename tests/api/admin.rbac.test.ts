import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/app/lib/http';
import { makeJsonRequest, createRouteContext } from '../utils/next';
import { GET as getPermissions, POST as postPermission } from '@/app/api/v1/admin/rbac/permissions/route';
import {
  PATCH as patchPermission,
  DELETE as deletePermission,
} from '@/app/api/v1/admin/rbac/permissions/[permissionId]/route';
import { GET as getMappings, PUT as putMappings } from '@/app/api/v1/admin/rbac/mappings/route';
import { GET as getRoles } from '@/app/api/v1/admin/rbac/roles/route';
import { GET as getFieldRules, POST as postFieldRule } from '@/app/api/v1/admin/rbac/field-rules/route';

import * as authz from '@/app/lib/authz';
import * as rbacAdminQueries from '@/app/db/queries/rbac-admin';

vi.mock('@/app/lib/authz', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/app/db/queries/rbac-admin', () => ({
  listRbacPermissions: vi.fn(async () => []),
  createRbacPermission: vi.fn(async (input: { key: string; description?: string | null }) => ({
    id: 'perm-1',
    key: input.key,
    description: input.description ?? null,
  })),
  updateRbacPermission: vi.fn(async (permissionId: string, input: { key?: string; description?: string | null }) => ({
    id: permissionId,
    key: input.key ?? 'admin:rbac:permissions:read',
    description: input.description ?? null,
  })),
  deleteRbacPermission: vi.fn(async (permissionId: string) => ({
    id: permissionId,
    key: 'admin:rbac:permissions:read',
  })),
  listRbacRoles: vi.fn(async () => [{ id: 'role-1', key: 'admin', description: 'Admin' }]),
  listRbacPositions: vi.fn(async () => [{ id: 'pos-1', key: 'ADMIN', displayName: 'Admin' }]),
  listRolePermissionMappings: vi.fn(async () => []),
  listPositionPermissionMappings: vi.fn(async () => []),
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
}));

const basePermissionsPath = '/api/v1/admin/rbac/permissions';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authz.requireAuth).mockResolvedValue({
    userId: 'admin-1',
    roles: ['ADMIN'],
    claims: {},
  } as Awaited<ReturnType<typeof authz.requireAuth>>);
});

describe('RBAC permissions routes', () => {
  it('GET /api/v1/admin/rbac/permissions returns 401 when auth fails', async () => {
    vi.mocked(authz.requireAuth).mockRejectedValueOnce(new ApiError(401, 'Unauthorized', 'unauthorized'));

    const req = makeJsonRequest({ method: 'GET', path: basePermissionsPath });
    const res = await getPermissions(req as any, createRouteContext());

    expect(res.status).toBe(401);
  });

  it('GET /api/v1/admin/rbac/permissions returns items', async () => {
    vi.mocked(rbacAdminQueries.listRbacPermissions).mockResolvedValueOnce([
      { id: 'perm-1', key: 'admin:rbac:permissions:read', description: null },
    ]);

    const req = makeJsonRequest({
      method: 'GET',
      path: `${basePermissionsPath}?q=rbac&limit=5&offset=0`,
    });
    const res = await getPermissions(req as any, createRouteContext());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
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
      body: { key: 'admin:rbac:permissions:create', description: 'Create RBAC permissions' },
    });

    const res = await postPermission(req as any, createRouteContext());

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.permission.key).toBe('admin:rbac:permissions:create');
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

  it('DELETE /api/v1/admin/rbac/permissions/:permissionId returns 404 when missing', async () => {
    vi.mocked(rbacAdminQueries.deleteRbacPermission).mockResolvedValueOnce(undefined as never);

    const req = makeJsonRequest({ method: 'DELETE', path: `${basePermissionsPath}/perm-missing` });
    const res = await deletePermission(req as any, createRouteContext({ permissionId: 'perm-missing' }));

    expect(res.status).toBe(404);
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
});
