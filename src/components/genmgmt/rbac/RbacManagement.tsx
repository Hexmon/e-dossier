"use client";

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getPermissionDisplayMeta } from '@/app/lib/rbac/permission-display';
import { useRbacPermissions } from '@/hooks/useRbacPermissions';
import { useRbacMappings } from '@/hooks/useRbacMappings';
import { useRbacFieldRules } from '@/hooks/useRbacFieldRules';
import { useRbacRoles } from '@/hooks/useRbacRoles';

type FieldRuleMode = 'ALLOW' | 'DENY' | 'OMIT' | 'MASK';

function toHumanText(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(' ');
}

function arraysHaveSameValues(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  for (const value of left) {
    if (!rightSet.has(value)) return false;
  }
  return true;
}

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
  const [permissionSearch, setPermissionSearch] = useState('');
  const [mappingSearch, setMappingSearch] = useState('');
  const [showTechnicalKeys, setShowTechnicalKeys] = useState(false);

  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [mappingPermissionIds, setMappingPermissionIds] = useState<string[]>([]);

  const [fieldRulePermissionId, setFieldRulePermissionId] = useState('');
  const [fieldRuleMode, setFieldRuleMode] = useState<FieldRuleMode>('OMIT');
  const [fieldRuleRoleId, setFieldRuleRoleId] = useState('');
  const [fieldRulePositionId, setFieldRulePositionId] = useState('');
  const [fieldRuleFields, setFieldRuleFields] = useState('');

  const activeRole = useMemo(() => roles.find((item) => item.id === selectedRoleId) ?? null, [roles, selectedRoleId]);
  const activePosition = useMemo(
    () => positions.find((item) => item.id === selectedPositionId) ?? null,
    [positions, selectedPositionId]
  );
  const mappingScopeSelected = Boolean(selectedRoleId || selectedPositionId);

  const currentScopePermissionIds = useMemo(() => {
    if (selectedRoleId) {
      return roleMappings.filter((row) => row.roleId === selectedRoleId).map((row) => row.permissionId);
    }
    if (selectedPositionId) {
      return positionMappings
        .filter((row) => row.positionId === selectedPositionId)
        .map((row) => row.permissionId);
    }
    return [];
  }, [positionMappings, roleMappings, selectedPositionId, selectedRoleId]);

  const hasUnsavedMappingChanges = useMemo(
    () => mappingScopeSelected && !arraysHaveSameValues(mappingPermissionIds, currentScopePermissionIds),
    [currentScopePermissionIds, mappingPermissionIds, mappingScopeSelected]
  );

  const activeScopeLabel = useMemo(() => {
    if (activeRole) {
      return `Mapping for Role: ${activeRole.description?.trim() || toHumanText(activeRole.key)}`;
    }
    if (activePosition) {
      return `Mapping for Position: ${activePosition.displayName?.trim() || toHumanText(activePosition.key)}`;
    }
    return 'Step 1: Select a role or position to begin.';
  }, [activePosition, activeRole]);

  const permissionItems = useMemo(() => {
    return permissions
      .map((permission) => {
        const meta = getPermissionDisplayMeta(permission.key, permission.description);
        const searchText = [
          permission.key,
          meta.title,
          meta.moduleLabel,
          meta.areaLabel,
          meta.description,
          meta.actionLabel,
        ]
          .join(' ')
          .toLowerCase();
        return { permission, meta, searchText };
      })
      .sort((a, b) => a.meta.title.localeCompare(b.meta.title));
  }, [permissions]);

  const filteredPermissionItems = useMemo(() => {
    const q = permissionSearch.trim().toLowerCase();
    if (!q) return permissionItems;
    return permissionItems.filter((item) => item.searchText.includes(q));
  }, [permissionItems, permissionSearch]);

  const filteredMappingItems = useMemo(() => {
    const q = mappingSearch.trim().toLowerCase();
    if (!q) return permissionItems;
    return permissionItems.filter((item) => item.searchText.includes(q));
  }, [mappingSearch, permissionItems]);

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

  const handleSelectAllShown = () => {
    if (!mappingScopeSelected) return;
    setMappingPermissionIds((prev) =>
      Array.from(new Set([...prev, ...filteredMappingItems.map((item) => item.permission.id)]))
    );
  };

  const handleClearAllShown = () => {
    if (!mappingScopeSelected) return;
    const shownIds = new Set(filteredMappingItems.map((item) => item.permission.id));
    setMappingPermissionIds((prev) => prev.filter((id) => !shownIds.has(id)));
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold">Permissions</h3>
            <p className="text-sm text-muted-foreground">What actions a user is allowed to do.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowTechnicalKeys((prev) => !prev)}
          >
            {showTechnicalKeys ? 'Hide technical keys' : 'Show technical keys (Advanced)'}
          </Button>
        </div>

        <div className="mb-2 grid gap-2 md:grid-cols-[1.3fr_1.3fr_auto]">
          <div className="space-y-1">
            <label className="text-xs font-medium">Permission Key (Advanced)</label>
            <Input
              placeholder="admin:appointments:create"
              value={permissionKey}
              onChange={(event) => setPermissionKey(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">Use colon format like `admin:appointments:create`.</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Friendly Description (Optional)</label>
            <Input
              placeholder="Allows creating appointment records."
              value={permissionDescription}
              onChange={(event) => setPermissionDescription(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">Shown in RBAC UI for non-technical users.</p>
          </div>
          <Button
            className="self-end"
            onClick={handleCreatePermission}
            disabled={permissionsQuery.createPermission.isPending || !permissionKey.trim()}
          >
            Add
          </Button>
        </div>

        <p className="mb-4 text-xs text-muted-foreground">
          Examples: `admin:appointments:create`, `admin:courses:read`, `page:dashboard:genmgmt:rbac:view`
        </p>

        <div className="mb-4">
          <Input
            placeholder="Search actions (e.g., create appointments, view reports)"
            value={permissionSearch}
            onChange={(event) => setPermissionSearch(event.target.value)}
          />
        </div>

        <div className="max-h-80 overflow-auto rounded border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="p-2 text-left">Permission</th>
                <th className="p-2 text-left">Description</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPermissionItems.map(({ permission, meta }) => (
                <tr key={permission.id} className="border-t align-top">
                  <td className="p-2">
                    <div className="font-medium">{meta.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Module: {meta.moduleLabel} | Area: {meta.areaLabel}
                    </div>
                    {showTechnicalKeys ? (
                      <div className="mt-1 font-mono text-[11px] text-muted-foreground">{permission.key}</div>
                    ) : null}
                  </td>
                  <td className="p-2">{meta.description}</td>
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
              {filteredPermissionItems.length === 0 ? (
                <tr>
                  <td className="p-4 text-sm text-muted-foreground" colSpan={3}>
                    No permissions match this search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="text-lg font-semibold">Role/Position Mappings</h3>
        <p className="text-sm text-muted-foreground">Assign these actions to a role or position.</p>

        <div className="mt-3 rounded-md border bg-muted/30 p-3 text-sm">
          <p>1. Choose Role or Position.</p>
          <p>2. Select permissions from the list below.</p>
          <p>3. Save mapping for the chosen scope.</p>
          <p className="mt-2 font-medium">{activeScopeLabel}</p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                  {role.description?.trim() || toHumanText(role.key)}
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
                  {position.displayName?.trim() || toHumanText(position.key)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Input
            placeholder="Search actions (e.g., create appointments, view reports)"
            value={mappingSearch}
            onChange={(event) => setMappingSearch(event.target.value)}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSelectAllShown}
              disabled={!mappingScopeSelected || filteredMappingItems.length === 0}
            >
              Select all shown
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearAllShown}
              disabled={!mappingScopeSelected || filteredMappingItems.length === 0}
            >
              Clear all shown
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              Selected {mappingPermissionIds.length} of {permissions.length} permissions.
            </span>
            {mappingScopeSelected ? (
              hasUnsavedMappingChanges ? (
                <span className="rounded bg-warning/20 px-2 py-0.5 font-medium text-warning-foreground">
                  You have unsaved mapping changes.
                </span>
              ) : (
                <span>All changes saved for current scope.</span>
              )
            ) : (
              <span>Select role or position to edit mappings.</span>
            )}
          </div>
        </div>

        <div className="mt-3 grid max-h-80 gap-2 overflow-auto rounded border p-3 md:grid-cols-2">
          {filteredMappingItems.map(({ permission, meta }) => {
            const checked = mappingPermissionIds.includes(permission.id);
            return (
              <label
                key={permission.id}
                className={`flex cursor-pointer items-start gap-3 rounded border p-3 text-xs ${
                  checked ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <input
                  className="mt-0.5"
                  type="checkbox"
                  checked={checked}
                  disabled={!mappingScopeSelected}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setMappingPermissionIds((prev) => Array.from(new Set([...prev, permission.id])));
                    } else {
                      setMappingPermissionIds((prev) => prev.filter((id) => id !== permission.id));
                    }
                  }}
                />
                <span className="space-y-1">
                  <span className="block text-sm font-medium">{meta.title}</span>
                  <span className="inline-flex rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {meta.moduleLabel}
                  </span>
                  <span className="block text-xs text-muted-foreground">{meta.description}</span>
                  {showTechnicalKeys ? (
                    <span className="block font-mono text-[11px] text-muted-foreground">{permission.key}</span>
                  ) : null}
                </span>
              </label>
            );
          })}
          {filteredMappingItems.length === 0 ? (
            <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
              No permissions found for this search.
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            onClick={handleSetRoleMappings}
            disabled={!selectedRoleId || mappings.setRoleMappings.isPending || !hasUnsavedMappingChanges}
          >
            Save Role Mapping
          </Button>
          <Button
            variant="secondary"
            onClick={handleSetPositionMappings}
            disabled={!selectedPositionId || mappings.setPositionMappings.isPending || !hasUnsavedMappingChanges}
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
