"use client";

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRbacPermissions } from '@/hooks/useRbacPermissions';
import { useRbacMappings } from '@/hooks/useRbacMappings';
import { useRbacFieldRules } from '@/hooks/useRbacFieldRules';
import { useRbacRoles } from '@/hooks/useRbacRoles';

type FieldRuleMode = 'ALLOW' | 'DENY' | 'OMIT' | 'MASK';

export default function RbacManagement() {
  const permissionsQuery = useRbacPermissions();
  const mappings = useRbacMappings();
  const fieldRules = useRbacFieldRules();
  const rolesQuery = useRbacRoles();

  const permissions = permissionsQuery.data ?? [];
  const roleMappings = mappings.mappings.data?.roleMappings ?? [];
  const positionMappings = mappings.mappings.data?.positionMappings ?? [];
  const roles = mappings.rolesAndPositions.data?.roles ?? [];
  const positions = mappings.rolesAndPositions.data?.positions ?? [];

  const [permissionKey, setPermissionKey] = useState('');
  const [permissionDescription, setPermissionDescription] = useState('');
  const [roleKey, setRoleKey] = useState('');
  const [roleDescription, setRoleDescription] = useState('');

  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [mappingPermissionIds, setMappingPermissionIds] = useState<string[]>([]);

  const [fieldRulePermissionId, setFieldRulePermissionId] = useState('');
  const [fieldRuleMode, setFieldRuleMode] = useState<FieldRuleMode>('OMIT');
  const [fieldRuleRoleId, setFieldRuleRoleId] = useState('');
  const [fieldRulePositionId, setFieldRulePositionId] = useState('');
  const [fieldRuleFields, setFieldRuleFields] = useState('');

  const activeScopeLabel = useMemo(() => {
    if (selectedRoleId) {
      const role = roles.find((item) => item.id === selectedRoleId);
      return role ? `Role: ${role.key}` : 'Role';
    }
    if (selectedPositionId) {
      const position = positions.find((item) => item.id === selectedPositionId);
      return position ? `Position: ${position.key}` : 'Position';
    }
    return 'None';
  }, [positions, roles, selectedPositionId, selectedRoleId]);

  const handleCreatePermission = async () => {
    if (!permissionKey.trim()) return;
    await permissionsQuery.createPermission.mutateAsync({
      key: permissionKey.trim(),
      description: permissionDescription.trim() || null,
    });
    setPermissionKey('');
    setPermissionDescription('');
  };

  const handleCreateRole = async () => {
    if (!roleKey.trim()) return;
    await rolesQuery.createRole.mutateAsync({
      key: roleKey.trim(),
      description: roleDescription.trim() || null,
    });
    setRoleKey('');
    setRoleDescription('');
  };

  const handleSetRoleMappings = async () => {
    if (!selectedRoleId) return;
    await mappings.setRoleMappings.mutateAsync({
      roleId: selectedRoleId,
      permissionIds: mappingPermissionIds,
    });
  };

  const handleSetPositionMappings = async () => {
    if (!selectedPositionId) return;
    await mappings.setPositionMappings.mutateAsync({
      positionId: selectedPositionId,
      permissionIds: mappingPermissionIds,
    });
  };

  const handleCreateFieldRule = async () => {
    if (!fieldRulePermissionId) return;
    if (!fieldRuleRoleId && !fieldRulePositionId) return;

    const fields = fieldRuleFields
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    await fieldRules.createRule.mutateAsync({
      permissionId: fieldRulePermissionId,
      roleId: fieldRuleRoleId || null,
      positionId: fieldRulePositionId || null,
      mode: fieldRuleMode,
      fields,
    });

    setFieldRuleFields('');
  };

  return (
    <div className="space-y-8">
      <section className="rounded-lg border p-4">
        <h3 className="text-lg font-semibold">Roles</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Manage role keys used for RBAC mappings and principal role assignment.
        </p>

        <div className="mb-4 flex gap-2">
          <Input
            placeholder="role key (e.g. hoat)"
            value={roleKey}
            onChange={(event) => setRoleKey(event.target.value)}
          />
          <Input
            placeholder="description"
            value={roleDescription}
            onChange={(event) => setRoleDescription(event.target.value)}
          />
          <Button
            onClick={handleCreateRole}
            disabled={rolesQuery.createRole.isPending || !roleKey.trim()}
          >
            Add
          </Button>
        </div>

        <div className="max-h-72 overflow-auto rounded border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="p-2 text-left">Key</th>
                <th className="p-2 text-left">Description</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => {
                const immutable = ['admin', 'super_admin'].includes(role.key.toLowerCase());
                return (
                  <tr key={role.id} className="border-t">
                    <td className="p-2 font-mono text-xs">{role.key}</td>
                    <td className="p-2">{role.description ?? '-'}</td>
                    <td className="p-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={immutable || rolesQuery.deleteRole.isPending}
                        onClick={() => rolesQuery.deleteRole.mutate(role.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="text-lg font-semibold">Permissions</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Create and review action keys used by authorization checks.
        </p>

        <div className="mb-4 flex gap-2">
          <Input
            placeholder="permission key (e.g. admin:rbac:permissions:read)"
            value={permissionKey}
            onChange={(event) => setPermissionKey(event.target.value)}
          />
          <Input
            placeholder="description"
            value={permissionDescription}
            onChange={(event) => setPermissionDescription(event.target.value)}
          />
          <Button
            onClick={handleCreatePermission}
            disabled={permissionsQuery.createPermission.isPending || !permissionKey.trim()}
          >
            Add
          </Button>
        </div>

        <div className="max-h-72 overflow-auto rounded border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="p-2 text-left">Key</th>
                <th className="p-2 text-left">Description</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((permission) => (
                <tr key={permission.id} className="border-t">
                  <td className="p-2 font-mono text-xs">{permission.key}</td>
                  <td className="p-2">{permission.description ?? '-'}</td>
                  <td className="p-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={permissionsQuery.deletePermission.isPending}
                      onClick={() => permissionsQuery.deletePermission.mutate(permission.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="text-lg font-semibold">Role/Position Mappings</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Assign permissions to roles or positions. Current scope: {activeScopeLabel}
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <select
              className="h-9 w-full rounded border bg-background px-2"
              value={selectedRoleId}
              onChange={(event) => {
                const nextRoleId = event.target.value;
                setSelectedRoleId(nextRoleId);
                setSelectedPositionId('');
                setMappingPermissionIds(
                  roleMappings.filter((row) => row.roleId === nextRoleId).map((row) => row.permissionId)
                );
              }}
            >
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.key}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Position</label>
            <select
              className="h-9 w-full rounded border bg-background px-2"
              value={selectedPositionId}
              onChange={(event) => {
                const nextPositionId = event.target.value;
                setSelectedPositionId(nextPositionId);
                setSelectedRoleId('');
                setMappingPermissionIds(
                  positionMappings
                    .filter((row) => row.positionId === nextPositionId)
                    .map((row) => row.permissionId)
                );
              }}
            >
              <option value="">Select position</option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.key}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid max-h-72 gap-2 overflow-auto rounded border p-3 md:grid-cols-2">
          {permissions.map((permission) => {
            const checked = mappingPermissionIds.includes(permission.id);
            return (
              <label key={permission.id} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setMappingPermissionIds((prev) => Array.from(new Set([...prev, permission.id])));
                    } else {
                      setMappingPermissionIds((prev) => prev.filter((id) => id !== permission.id));
                    }
                  }}
                />
                <span className="font-mono">{permission.key}</span>
              </label>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={handleSetRoleMappings} disabled={!selectedRoleId || mappings.setRoleMappings.isPending}>
            Save Role Mapping
          </Button>
          <Button
            variant="secondary"
            onClick={handleSetPositionMappings}
            disabled={!selectedPositionId || mappings.setPositionMappings.isPending}
          >
            Save Position Mapping
          </Button>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="text-lg font-semibold">Field Rules</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Configure field-level control (`ALLOW`, `DENY`, `OMIT`, `MASK`) per permission/action.
        </p>

        <div className="mb-3 grid gap-2 md:grid-cols-5">
          <select
            className="h-9 rounded border bg-background px-2"
            value={fieldRulePermissionId}
            onChange={(event) => setFieldRulePermissionId(event.target.value)}
          >
            <option value="">Select permission</option>
            {permissions.map((permission) => (
              <option key={permission.id} value={permission.id}>
                {permission.key}
              </option>
            ))}
          </select>

          <select
            className="h-9 rounded border bg-background px-2"
            value={fieldRuleRoleId}
            onChange={(event) => {
              setFieldRuleRoleId(event.target.value);
              if (event.target.value) setFieldRulePositionId('');
            }}
          >
            <option value="">Role scope (optional)</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.key}
              </option>
            ))}
          </select>

          <select
            className="h-9 rounded border bg-background px-2"
            value={fieldRulePositionId}
            onChange={(event) => {
              setFieldRulePositionId(event.target.value);
              if (event.target.value) setFieldRuleRoleId('');
            }}
          >
            <option value="">Position scope (optional)</option>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.key}
              </option>
            ))}
          </select>

          <select
            className="h-9 rounded border bg-background px-2"
            value={fieldRuleMode}
            onChange={(event) => setFieldRuleMode(event.target.value as FieldRuleMode)}
          >
            <option value="ALLOW">ALLOW</option>
            <option value="DENY">DENY</option>
            <option value="OMIT">OMIT</option>
            <option value="MASK">MASK</option>
          </select>

          <Button
            onClick={handleCreateFieldRule}
            disabled={
              !fieldRulePermissionId ||
              fieldRules.createRule.isPending ||
              (!fieldRuleRoleId && !fieldRulePositionId)
            }
          >
            Add Field Rule
          </Button>
        </div>

        <Input
          placeholder="fields (comma separated)"
          value={fieldRuleFields}
          onChange={(event) => setFieldRuleFields(event.target.value)}
        />

        <div className="mt-3 max-h-72 overflow-auto rounded border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="p-2 text-left">Permission</th>
                <th className="p-2 text-left">Scope</th>
                <th className="p-2 text-left">Mode</th>
                <th className="p-2 text-left">Fields</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(fieldRules.data ?? []).map((rule) => (
                <tr key={rule.id} className="border-t">
                  <td className="p-2 font-mono">{rule.permissionKey}</td>
                  <td className="p-2">{rule.positionKey ?? rule.roleKey ?? '-'}</td>
                  <td className="p-2">{rule.mode}</td>
                  <td className="p-2">{(rule.fields ?? []).join(', ') || '-'}</td>
                  <td className="p-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={fieldRules.deleteRule.isPending}
                      onClick={() => fieldRules.deleteRule.mutate(rule.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
