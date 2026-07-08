"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getPermissionDisplayMeta } from '@/app/lib/rbac/permission-display';
import { useRbacPermissions } from '@/hooks/useRbacPermissions';
import { useRbacMappings } from '@/hooks/useRbacMappings';
import { useRbacFieldRules } from '@/hooks/useRbacFieldRules';
import { useRbacRoles } from '@/hooks/useRbacRoles';
import { searchUsers, type User } from '@/app/lib/api/userApi';
import {
  rbacApi,
  type EffectiveRbacBundle,
  type FieldRule,
  type PositionPermissionMapping,
  type RbacActiveAppointment,
  type RbacFieldCatalogItem,
  type RbacPermission,
  type RbacPosition,
  type RbacRole,
  type RolePermissionMapping,
} from '@/app/lib/api/rbacApi';

type FieldRuleMode = 'ALLOW' | 'DENY' | 'OMIT' | 'MASK';
type RbacManagementSection = 'appointment-access' | 'field-access' | 'access-preview';

const EMPTY_PERMISSIONS: RbacPermission[] = [];
const EMPTY_ROLE_MAPPINGS: RolePermissionMapping[] = [];
const EMPTY_POSITION_MAPPINGS: PositionPermissionMapping[] = [];
const EMPTY_ROLES: RbacRole[] = [];
const EMPTY_POSITIONS: RbacPosition[] = [];
const EMPTY_USERS: User[] = [];
const EMPTY_FIELD_RULES: FieldRule[] = [];
const EMPTY_FIELD_CATALOG: RbacFieldCatalogItem[] = [];
const EMPTY_RBAC_ACTIVE_APPOINTMENTS: RbacActiveAppointment[] = [];
const EMPTY_ACTIVE_APPOINTMENTS: NonNullable<User['activeAppointments']> = [];

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

  const permissions = permissionsQuery.data ?? EMPTY_PERMISSIONS;
  const roleMappings = mappings.mappings.data?.roleMappings ?? EMPTY_ROLE_MAPPINGS;
  const positionMappings = mappings.mappings.data?.positionMappings ?? EMPTY_POSITION_MAPPINGS;
  const roles = mappings.rolesAndPositions.data?.roles ?? EMPTY_ROLES;
  const positions = mappings.rolesAndPositions.data?.positions ?? EMPTY_POSITIONS;
  const fieldRuleItems = fieldRules.data ?? EMPTY_FIELD_RULES;
  const fieldRuleDefaults = fieldRules.defaults?.defaultFieldRules ?? [];
  const missingDefaultFieldRules = fieldRules.defaults?.missingDefaultFieldRules ?? [];
  const fieldCatalog = fieldRules.fieldCatalog ?? EMPTY_FIELD_CATALOG;
  const rbacActiveAppointments = fieldRules.activeAppointments ?? EMPTY_RBAC_ACTIVE_APPOINTMENTS;
  const loadedPermissionCount = permissionsQuery.loadedCount ?? permissions.length;
  const totalPermissionCount = permissionsQuery.total ?? permissions.length;

  const [activeSection, setActiveSection] = useState<RbacManagementSection>('appointment-access');
  const [permissionKey, setPermissionKey] = useState('');
  const [permissionDescription, setPermissionDescription] = useState('');
  const [roleKey, setRoleKey] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [mappingSearch, setMappingSearch] = useState('');
  const [mappingModuleFilter, setMappingModuleFilter] = useState('all');
  const [mappingTypeFilter, setMappingTypeFilter] = useState('all');
  const [mappingActionFilter, setMappingActionFilter] = useState('all');
  const [mappingDefaultFilter, setMappingDefaultFilter] = useState('all');
  const [showTechnicalKeys, setShowTechnicalKeys] = useState(false);

  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [mappingPermissionIds, setMappingPermissionIds] = useState<string[]>([]);
  const [syncedMappingScopeKey, setSyncedMappingScopeKey] = useState('');

  const [fieldRulePermissionId, setFieldRulePermissionId] = useState('');
  const [fieldRuleMode, setFieldRuleMode] = useState<FieldRuleMode>('OMIT');
  const [fieldRuleRoleId, setFieldRuleRoleId] = useState('');
  const [fieldRulePositionId, setFieldRulePositionId] = useState('');
  const [fieldRuleFields, setFieldRuleFields] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<User[]>(EMPTY_USERS);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchError, setUserSearchError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [showManualEffectiveInputs, setShowManualEffectiveInputs] = useState(false);
  const [effectiveUserId, setEffectiveUserId] = useState('');
  const [effectiveAppointmentId, setEffectiveAppointmentId] = useState('');
  const [effectiveBundle, setEffectiveBundle] = useState<EffectiveRbacBundle | null>(null);
  const [effectiveLoading, setEffectiveLoading] = useState(false);
  const [fieldAccessAppointmentId, setFieldAccessAppointmentId] = useState('');
  const [fieldCatalogSearch, setFieldCatalogSearch] = useState('');
  const [fieldCatalogModuleFilter, setFieldCatalogModuleFilter] = useState('all');
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  const [allowSelectedRead, setAllowSelectedRead] = useState(true);
  const [allowSelectedWrite, setAllowSelectedWrite] = useState(false);
  const [fieldAccessSaving, setFieldAccessSaving] = useState(false);

  const activeRole = useMemo(() => roles.find((item) => item.id === selectedRoleId) ?? null, [roles, selectedRoleId]);
  const activePosition = useMemo(
    () => positions.find((item) => item.id === selectedPositionId) ?? null,
    [positions, selectedPositionId]
  );
  const mappingScopeSelected = Boolean(selectedRoleId || selectedPositionId);
  const selectedUser = useMemo(
    () => userSearchResults.find((item) => item.id === selectedUserId) ?? null,
    [selectedUserId, userSearchResults]
  );
  const selectedUserAppointments = selectedUser?.activeAppointments ?? EMPTY_ACTIVE_APPOINTMENTS;
  const selectedAppointment = useMemo(
    () => selectedUserAppointments.find((item) => item.id === selectedAppointmentId) ?? null,
    [selectedAppointmentId, selectedUserAppointments]
  );
  const selectedRbacAppointment = useMemo(
    () => rbacActiveAppointments.find((item) => item.id === fieldAccessAppointmentId) ?? null,
    [fieldAccessAppointmentId, rbacActiveAppointments]
  );
  const permissionIdByKey = useMemo(
    () => new Map(permissions.map((permission) => [permission.key, permission.id])),
    [permissions]
  );
  const fieldCatalogModules = useMemo(
    () => Array.from(new Set(fieldCatalog.map((field) => field.moduleLabel))).sort(),
    [fieldCatalog]
  );
  const selectedFieldIdSet = useMemo(() => new Set(selectedFieldIds), [selectedFieldIds]);
  const filteredFieldCatalog = useMemo(() => {
    const q = fieldCatalogSearch.trim().toLowerCase();
    return fieldCatalog.filter((field) => {
      if (!showTechnicalKeys && field.technical) return false;
      if (fieldCatalogModuleFilter !== 'all' && field.moduleLabel !== fieldCatalogModuleFilter) return false;
      if (!q) return true;
      return [
        field.moduleLabel,
        field.areaLabel,
        field.tableName,
        field.fieldLabel,
        field.fieldName,
        field.columnName,
        field.resourceType ?? '',
      ].join(' ').toLowerCase().includes(q);
    });
  }, [fieldCatalog, fieldCatalogModuleFilter, fieldCatalogSearch, showTechnicalKeys]);
  const selectedFieldCatalogItems = useMemo(
    () => fieldCatalog.filter((field) => selectedFieldIdSet.has(field.id)),
    [fieldCatalog, selectedFieldIdSet]
  );

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

  const defaultScopePermissionIds = useMemo(() => {
    const defaults = mappings.mappings.data?.defaults;
    if (!defaults) return [];
    if (selectedRoleId) {
      return defaults.defaultRoleMappings
        .filter((row) => row.roleId === selectedRoleId)
        .map((row) => row.permissionId);
    }
    if (selectedPositionId) {
      return defaults.defaultPositionMappings
        .filter((row) => row.positionId === selectedPositionId)
        .map((row) => row.permissionId);
    }
    return [];
  }, [mappings.mappings.data?.defaults, selectedPositionId, selectedRoleId]);

  const defaultProfileLabelByKey = useMemo(() => {
    const defaults = mappings.mappings.data?.defaults;
    const entries = defaults?.defaultProfiles ?? [];
    return new Map(entries.map((profile) => [profile.key, profile.label]));
  }, [mappings.mappings.data?.defaults]);

  const defaultProfileLabelsByPermissionId = useMemo(() => {
    const defaults = mappings.mappings.data?.defaults;
    const map = new Map<string, string[]>();
    if (!defaults) return map;
    const rows = selectedRoleId
      ? defaults.defaultRoleMappings.filter((row) => row.roleId === selectedRoleId)
      : selectedPositionId
        ? defaults.defaultPositionMappings.filter((row) => row.positionId === selectedPositionId)
        : [];

    for (const row of rows) {
      const label = defaultProfileLabelByKey.get(row.profileKey) ?? toHumanText(row.profileKey);
      const labels = map.get(row.permissionId) ?? [];
      if (!labels.includes(label)) labels.push(label);
      map.set(row.permissionId, labels);
    }
    return map;
  }, [defaultProfileLabelByKey, mappings.mappings.data?.defaults, selectedPositionId, selectedRoleId]);

  const defaultScopePermissionIdSet = useMemo(
    () => new Set(defaultScopePermissionIds),
    [defaultScopePermissionIds]
  );
  const currentScopePermissionIdSet = useMemo(
    () => new Set(currentScopePermissionIds),
    [currentScopePermissionIds]
  );

  const defaultSummary = useMemo(() => {
    const missing = defaultScopePermissionIds.filter((id) => !currentScopePermissionIdSet.has(id)).length;
    const extra = currentScopePermissionIds.filter((id) => !defaultScopePermissionIdSet.has(id)).length;
    return {
      defaultCount: defaultScopePermissionIds.length,
      missing,
      extra,
    };
  }, [
    currentScopePermissionIdSet,
    currentScopePermissionIds,
    defaultScopePermissionIdSet,
    defaultScopePermissionIds,
  ]);

  const activeScopeFieldRules = useMemo(() => {
    if (selectedRoleId) return fieldRuleItems.filter((rule) => rule.roleId === selectedRoleId);
    if (selectedPositionId) return fieldRuleItems.filter((rule) => rule.positionId === selectedPositionId);
    return [];
  }, [fieldRuleItems, selectedPositionId, selectedRoleId]);

  const appointmentFieldAccessRows = useMemo(() => {
    return rbacActiveAppointments.flatMap((appointment) =>
      fieldRuleItems
        .filter((rule) => rule.appointmentId === appointment.id || rule.positionId === appointment.positionId)
        .flatMap((rule) =>
          (rule.fields.length ? rule.fields : ['*']).map((field) => ({
            appointment,
            rule,
            field,
            source: rule.appointmentId === appointment.id ? 'Appointment' : 'Inherited position',
          }))
        )
    );
  }, [fieldRuleItems, rbacActiveAppointments]);

  const filteredAppointmentFieldAccessRows = useMemo(() => {
    if (!fieldAccessAppointmentId) return appointmentFieldAccessRows;
    return appointmentFieldAccessRows.filter((row) => row.appointment.id === fieldAccessAppointmentId);
  }, [appointmentFieldAccessRows, fieldAccessAppointmentId]);

  const hasUnsavedMappingChanges = useMemo(
    () => mappingScopeSelected && !arraysHaveSameValues(mappingPermissionIds, currentScopePermissionIds),
    [currentScopePermissionIds, mappingPermissionIds, mappingScopeSelected]
  );

  const activeScopeLabel = useMemo(() => {
    if (activeRole) {
      return `Advanced Role Mapping: ${activeRole.description?.trim() || toHumanText(activeRole.key)}`;
    }
    if (activePosition) {
      return `Appointment Position Mapping: ${activePosition.displayName?.trim() || toHumanText(activePosition.key)}`;
    }
    return 'Select an appointment position or advanced role to begin.';
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
    return permissionItems.filter((item) => {
      const permissionKey = item.permission.key;
      const checked = currentScopePermissionIdSet.has(item.permission.id);
      const isDefault = defaultScopePermissionIdSet.has(item.permission.id);
      const isMissingDefault = isDefault && !checked;
      const isCustom = checked && !isDefault;

      if (q && !item.searchText.includes(q)) return false;
      if (mappingModuleFilter !== 'all' && item.meta.moduleLabel !== mappingModuleFilter) return false;
      if (mappingTypeFilter === 'page' && !permissionKey.startsWith('page:')) return false;
      if (mappingTypeFilter === 'api' && (permissionKey.startsWith('page:') || permissionKey.startsWith('sidebar:'))) return false;
      if (mappingTypeFilter === 'sidebar' && !permissionKey.startsWith('sidebar:')) return false;
      if (mappingActionFilter !== 'all' && !permissionKey.endsWith(`:${mappingActionFilter}`)) return false;
      if (mappingDefaultFilter === 'default' && !isDefault) return false;
      if (mappingDefaultFilter === 'missing' && !isMissingDefault) return false;
      if (mappingDefaultFilter === 'custom' && !isCustom) return false;
      return true;
    });
  }, [
    currentScopePermissionIdSet,
    defaultScopePermissionIdSet,
    mappingActionFilter,
    mappingDefaultFilter,
    mappingModuleFilter,
    mappingSearch,
    mappingTypeFilter,
    permissionItems,
  ]);

  const moduleFilterOptions = useMemo(() => {
    return Array.from(new Set(permissionItems.map((item) => item.meta.moduleLabel))).sort();
  }, [permissionItems]);

  const activeScopeKey = selectedRoleId
    ? `role:${selectedRoleId}`
    : selectedPositionId
      ? `position:${selectedPositionId}`
      : '';

  useEffect(() => {
    if (!activeScopeKey) {
      if (syncedMappingScopeKey) setSyncedMappingScopeKey('');
      setMappingPermissionIds((prev) => (prev.length > 0 ? [] : prev));
      return;
    }
    if (activeScopeKey !== syncedMappingScopeKey) {
      setMappingPermissionIds(currentScopePermissionIds);
      setSyncedMappingScopeKey(activeScopeKey);
    }
  }, [activeScopeKey, currentScopePermissionIds, syncedMappingScopeKey]);

  const selectRoleMapping = (roleId: string) => {
    setSelectedRoleId(roleId);
    setSelectedPositionId('');
    setSyncedMappingScopeKey('');
    setMappingPermissionIds(roleMappings.filter((row) => row.roleId === roleId).map((row) => row.permissionId));
  };

  const selectPositionMapping = (positionId: string) => {
    setSelectedPositionId(positionId);
    setSelectedRoleId('');
    setSyncedMappingScopeKey('');
    setMappingPermissionIds(
      positionMappings.filter((row) => row.positionId === positionId).map((row) => row.permissionId)
    );
  };

  const handleSearchUsers = async () => {
    const query = userSearch.trim();
    if (!query) return;
    setUserSearchLoading(true);
    setUserSearchError('');
    try {
      const results = await searchUsers(query, undefined, 20);
      setUserSearchResults(results);
      if (results.length === 0) {
        setUserSearchError('No active users found for this search.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to search users.';
      setUserSearchError(message);
    } finally {
      setUserSearchLoading(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedAppointmentId('');
    setFieldAccessAppointmentId('');
    setEffectiveBundle(null);
    const user = userSearchResults.find((item) => item.id === userId);
    if (user?.id) {
      setEffectiveUserId(user.id);
    }
  };

  const handleSelectAppointment = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setEffectiveBundle(null);
    const appointment = selectedUserAppointments.find((item) => item.id === appointmentId);
    if (!appointment) return;
    selectPositionMapping(appointment.positionId);
    setFieldAccessAppointmentId(appointment.id);
    if (selectedUser?.id) {
      setEffectiveUserId(selectedUser.id);
      setEffectiveAppointmentId(appointment.id);
    }
  };

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

  const handleApplyDefaults = async () => {
    if (!mappingScopeSelected) return;
    const nextPermissionIds = Array.from(new Set(defaultScopePermissionIds));
    setMappingPermissionIds(nextPermissionIds);
    if (selectedRoleId) {
      await mappings.setRoleMappings.mutateAsync({
        roleId: selectedRoleId,
        permissionIds: nextPermissionIds,
      });
      return;
    }
    if (selectedPositionId) {
      await mappings.setPositionMappings.mutateAsync({
        positionId: selectedPositionId,
        permissionIds: nextPermissionIds,
      });
    }
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

  const toggleFieldSelection = (fieldId: string) => {
    setSelectedFieldIds((current) =>
      current.includes(fieldId)
        ? current.filter((id) => id !== fieldId)
        : [...current, fieldId]
    );
  };

  const selectVisibleFields = () => {
    const ids = filteredFieldCatalog
      .filter((field) => field.readPermissionKey || field.writePermissionKeys.length > 0)
      .map((field) => field.id);
    setSelectedFieldIds((current) => Array.from(new Set([...current, ...ids])));
  };

  const clearSelectedFields = () => setSelectedFieldIds([]);

  const upsertAppointmentFieldRule = async (permissionId: string, mode: FieldRuleMode, fields: string[]) => {
    const uniqueFields = Array.from(new Set(fields)).filter(Boolean).sort();
    if (!fieldAccessAppointmentId || uniqueFields.length === 0) return;

    const existing = fieldRuleItems.find(
      (rule) =>
        rule.appointmentId === fieldAccessAppointmentId &&
        rule.permissionId === permissionId &&
        rule.mode === mode
    );

    if (existing) {
      await fieldRules.updateRule.mutateAsync({
        ruleId: existing.id,
        input: {
          appointmentId: fieldAccessAppointmentId,
          positionId: null,
          roleId: null,
          fields: Array.from(new Set([...(existing.fields ?? []), ...uniqueFields])).sort(),
        },
      });
      return;
    }

    await fieldRules.createRule.mutateAsync({
      permissionId,
      appointmentId: fieldAccessAppointmentId,
      mode,
      fields: uniqueFields,
    });
  };

  const removeAppointmentFields = async (permissionIds: string[], fields: string[], modes: FieldRuleMode[]) => {
    const fieldSet = new Set(fields);
    const permissionSet = new Set(permissionIds);
    const modeSet = new Set(modes);
    const matchingRules = fieldRuleItems.filter(
      (rule) =>
        rule.appointmentId === fieldAccessAppointmentId &&
        permissionSet.has(rule.permissionId) &&
        modeSet.has(rule.mode)
    );

    for (const rule of matchingRules) {
      const nextFields = (rule.fields ?? []).filter((field) => !fieldSet.has(field)).sort();
      if (nextFields.length === 0) {
        await fieldRules.deleteRule.mutateAsync(rule.id);
      } else {
        await fieldRules.updateRule.mutateAsync({
          ruleId: rule.id,
          input: { fields: nextFields },
        });
      }
    }
  };

  const handleSaveAppointmentFieldAccess = async () => {
    if (!fieldAccessAppointmentId || selectedFieldCatalogItems.length === 0) return;
    setFieldAccessSaving(true);
    try {
      const readFieldsByPermission = new Map<string, string[]>();
      const writeFieldsByPermission = new Map<string, string[]>();

      for (const field of selectedFieldCatalogItems) {
        if (field.readPermissionKey) {
          const permissionId = permissionIdByKey.get(field.readPermissionKey);
          if (permissionId) {
            readFieldsByPermission.set(permissionId, [
              ...(readFieldsByPermission.get(permissionId) ?? []),
              field.fieldName,
            ]);
          }
        }
        for (const permissionKey of field.writePermissionKeys) {
          const permissionId = permissionIdByKey.get(permissionKey);
          if (permissionId) {
            writeFieldsByPermission.set(permissionId, [
              ...(writeFieldsByPermission.get(permissionId) ?? []),
              field.fieldName,
            ]);
          }
        }
      }

      const selectedFieldNames = selectedFieldCatalogItems.map((field) => field.fieldName);
      if (allowSelectedRead) {
        await removeAppointmentFields(Array.from(readFieldsByPermission.keys()), selectedFieldNames, ['OMIT', 'MASK', 'DENY']);
      } else {
        for (const [permissionId, fields] of readFieldsByPermission) {
          await upsertAppointmentFieldRule(permissionId, 'OMIT', fields);
        }
      }

      if (allowSelectedWrite) {
        await removeAppointmentFields(Array.from(writeFieldsByPermission.keys()), selectedFieldNames, ['DENY']);
      } else {
        for (const [permissionId, fields] of writeFieldsByPermission) {
          await upsertAppointmentFieldRule(permissionId, 'DENY', fields);
        }
      }
    } finally {
      setFieldAccessSaving(false);
    }
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

  const handleLoadEffectiveAccess = async () => {
    setEffectiveLoading(true);
    try {
      const response = await rbacApi.getEffectivePermissions({
        ...(effectiveUserId.trim() ? { userId: effectiveUserId.trim() } : {}),
        ...(effectiveAppointmentId.trim() ? { appointmentId: effectiveAppointmentId.trim() } : {}),
      });
      setEffectiveBundle(response.bundle);
    } finally {
      setEffectiveLoading(false);
    }
  };

  return (
    <Tabs
      value={activeSection}
      onValueChange={(value) => setActiveSection(value as RbacManagementSection)}
      className="space-y-6"
    >
      <div className="rounded-lg border bg-background p-3">
        <TabsList
          aria-label="RBAC management sections"
          className="grid h-auto w-full grid-cols-1 gap-1 sm:grid-cols-3"
        >
          <TabsTrigger value="appointment-access" className="py-2 text-xs sm:text-sm">
            Appointment Permissions
          </TabsTrigger>
          <TabsTrigger value="field-access" className="py-2 text-xs sm:text-sm">
            Field & Module Access
          </TabsTrigger>
          <TabsTrigger value="access-preview" className="py-2 text-xs sm:text-sm">
            Review Access
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="appointment-access" className="space-y-8">
      <section className="rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Select Active Appointment</h3>
            <p className="text-sm text-muted-foreground">
              Search a user and choose the active appointment whose access needs to be managed.
            </p>
          </div>
          <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            Position-first RBAC
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1.3fr_auto]">
          <Input
            placeholder="Search user by name, username, or email"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleSearchUsers();
              }
            }}
          />
          <Button onClick={handleSearchUsers} disabled={userSearchLoading || !userSearch.trim()}>
            {userSearchLoading ? 'Searching...' : 'Search Users'}
          </Button>
        </div>

        {userSearchError ? (
          <p className="mt-2 text-sm text-destructive">{userSearchError}</p>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">User</label>
            <select
              className="h-9 w-full rounded border bg-background px-2"
              value={selectedUserId}
              onChange={(event) => handleSelectUser(event.target.value)}
            >
              <option value="">Select searched user</option>
              {userSearchResults.map((user) => (
                <option key={user.id ?? user.username} value={user.id ?? ''}>
                  {[user.rank, user.name || user.username, user.username].filter(Boolean).join(' | ')}
                </option>
              ))}
            </select>
            {selectedUser ? (
              <p className="text-xs text-muted-foreground">
                {selectedUser.activeAppointments?.length ?? 0} active appointment(s) available.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Active Appointment</label>
            <select
              className="h-9 w-full rounded border bg-background px-2"
              value={selectedAppointmentId}
              onChange={(event) => handleSelectAppointment(event.target.value)}
              disabled={!selectedUser}
            >
              <option value="">Select appointment</option>
              {selectedUserAppointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  {appointment.positionName ?? toHumanText(appointment.positionKey)} | {appointment.scopeType}
                </option>
              ))}
            </select>
            {selectedAppointment ? (
              <p className="text-xs text-muted-foreground">
                Auto-selected position mapping: {selectedAppointment.positionName ?? selectedAppointment.positionKey}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!selectedPositionId}
            onClick={() => setActiveSection('field-access')}
          >
            Manage Field & Module Access
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!selectedAppointmentId}
            onClick={() => setActiveSection('access-preview')}
          >
            Review Selected Access
          </Button>
        </div>
      </section>

      </TabsContent>

      <TabsContent value="appointment-access" className="order-last space-y-8">
      <details className="rounded-lg border p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          Advanced system setup
        </summary>
        <div className="mt-4 space-y-8">
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

        <p className="mb-3 text-xs text-muted-foreground">
          Loaded {loadedPermissionCount} permissions / {totalPermissionCount} total.
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
                    <div className="mt-1 flex flex-wrap gap-1">
                      {permission.system ? (
                        <span className="inline-flex rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          System
                        </span>
                      ) : null}
                      {permission.defaultGrant ? (
                        <span className="inline-flex rounded bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                          Default grant
                        </span>
                      ) : null}
                    </div>
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
                      disabled={permission.system || permissionsQuery.deletePermission.isPending}
                      onClick={() => permissionsQuery.deletePermission.mutate(permission.id)}
                    >
                      {permission.system ? 'System managed' : 'Delete'}
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
        </div>
      </details>

      </TabsContent>

      <TabsContent value="appointment-access" className="space-y-8">
      <section className="rounded-lg border p-4">
        <h3 className="text-lg font-semibold">Appointment Permissions</h3>
        <p className="text-sm text-muted-foreground">
          Assign allowed actions to the selected appointment position.
        </p>

        <div className="mt-3 rounded-md border bg-muted/30 p-3 text-sm">
          <p className="mt-2 font-medium">{activeScopeLabel}</p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(240px,420px)_1fr]">
          <div className="space-y-2">
            <label className="text-sm font-medium">Appointment Position Mapping</label>
            <select
              className="h-9 w-full rounded border bg-background px-2"
              value={selectedPositionId}
              onChange={(event) => {
                selectPositionMapping(event.target.value);
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

          <details className="rounded-md border bg-muted/20 p-3">
            <summary className="cursor-pointer text-sm font-medium">Role mapping override</summary>
            <div className="mt-3 space-y-2">
              <label className="text-sm font-medium">Advanced Role Mapping</label>
              <select
                className="h-9 w-full rounded border bg-background px-2"
                value={selectedRoleId}
                onChange={(event) => {
                  selectRoleMapping(event.target.value);
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
          </details>
        </div>

        <div className="mt-4 space-y-2">
          <Input
            placeholder="Search actions (e.g., create appointments, view reports)"
            value={mappingSearch}
            onChange={(event) => setMappingSearch(event.target.value)}
          />

          <div className="grid gap-2 md:grid-cols-4">
            <select
              className="h-9 rounded border bg-background px-2 text-sm"
              value={mappingModuleFilter}
              onChange={(event) => setMappingModuleFilter(event.target.value)}
            >
              <option value="all">All modules</option>
              {moduleFilterOptions.map((moduleLabel) => (
                <option key={moduleLabel} value={moduleLabel}>
                  {moduleLabel}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded border bg-background px-2 text-sm"
              value={mappingTypeFilter}
              onChange={(event) => setMappingTypeFilter(event.target.value)}
            >
              <option value="all">All permission types</option>
              <option value="page">Pages</option>
              <option value="api">APIs</option>
              <option value="sidebar">Sidebar</option>
            </select>
            <select
              className="h-9 rounded border bg-background px-2 text-sm"
              value={mappingActionFilter}
              onChange={(event) => setMappingActionFilter(event.target.value)}
            >
              <option value="all">All actions</option>
              <option value="read">Read</option>
              <option value="view">View</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
            <select
              className="h-9 rounded border bg-background px-2 text-sm"
              value={mappingDefaultFilter}
              onChange={(event) => setMappingDefaultFilter(event.target.value)}
            >
              <option value="all">All grant status</option>
              <option value="default">Default grants</option>
              <option value="missing">Missing defaults</option>
              <option value="custom">Custom grants</option>
            </select>
          </div>

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
            <Button
              size="sm"
              variant="secondary"
              onClick={handleApplyDefaults}
              disabled={
                !mappingScopeSelected ||
                defaultScopePermissionIds.length === 0 ||
                mappings.setRoleMappings.isPending ||
                mappings.setPositionMappings.isPending
              }
            >
              Apply defaults
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              Selected {mappingPermissionIds.length} of {permissions.length} permissions.
            </span>
            {mappingScopeSelected ? (
              <span>
                Grants {currentScopePermissionIds.length} | Defaults {defaultSummary.defaultCount} | Missing{' '}
                {defaultSummary.missing} | Custom {defaultSummary.extra} | Field rules {activeScopeFieldRules.length}
              </span>
            ) : null}
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
            const defaultLabels = defaultProfileLabelsByPermissionId.get(permission.id) ?? [];
            const isDefault = defaultScopePermissionIdSet.has(permission.id);
            const statusLabel = isDefault
              ? checked
                ? 'Applied default'
                : 'Missing default'
              : checked
                ? 'Custom grant'
                : 'Not granted';
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
                  <span className="flex flex-wrap gap-1">
                    <span className="inline-flex rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {meta.moduleLabel}
                    </span>
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${
                        statusLabel === 'Applied default'
                          ? 'bg-success/10 text-success'
                          : statusLabel === 'Missing default'
                            ? 'bg-destructive/10 text-destructive'
                            : statusLabel === 'Custom grant'
                              ? 'bg-warning/20 text-warning-foreground'
                              : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {statusLabel}
                    </span>
                    {defaultLabels.length > 0 ? (
                      <span className="inline-flex rounded bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                        {defaultLabels.map((label) => `${label} default`).join(', ')}
                      </span>
                    ) : null}
                    {permission.system ? (
                      <span className="inline-flex rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        System
                      </span>
                    ) : null}
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
            onClick={handleSetPositionMappings}
            disabled={!selectedPositionId || mappings.setPositionMappings.isPending || !hasUnsavedMappingChanges}
          >
            Save Position Mapping
          </Button>
          <Button
            variant="secondary"
            onClick={handleSetRoleMappings}
            disabled={!selectedRoleId || mappings.setRoleMappings.isPending || !hasUnsavedMappingChanges}
          >
            Save Role Mapping
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!selectedPositionId}
            onClick={() => setActiveSection('field-access')}
          >
            Manage Fields
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!selectedAppointmentId && !effectiveUserId.trim()}
            onClick={() => setActiveSection('access-preview')}
          >
            Review Access
          </Button>
        </div>
      </section>

      </TabsContent>

      <TabsContent value="access-preview" className="space-y-8">
      <section className="rounded-lg border p-4">
        <h3 className="text-lg font-semibold">User Effective Access</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Preview the final permissions a user receives from appointment position mappings, compatible role mappings, and field rules.
        </p>

        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <div className="font-medium">
            {selectedUser
              ? `${selectedUser.rank ? `${selectedUser.rank} ` : ''}${selectedUser.name || selectedUser.username}`
              : 'No appointment user selected'}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Appointment:{' '}
            {selectedAppointment
              ? `${selectedAppointment.positionName ?? selectedAppointment.positionKey} / ${selectedAppointment.scopeType}`
              : 'Select a user and appointment above'}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            onClick={handleLoadEffectiveAccess}
            disabled={effectiveLoading || (!effectiveUserId.trim() && !selectedUser?.id)}
          >
            {effectiveLoading ? 'Previewing...' : 'Preview Selected Access'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowManualEffectiveInputs((prev) => !prev)}
          >
            {showManualEffectiveInputs ? 'Hide manual IDs' : 'Advanced manual IDs'}
          </Button>
        </div>

        {showManualEffectiveInputs ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <Input
              placeholder="User ID (blank = current user)"
              value={effectiveUserId}
              onChange={(event) => setEffectiveUserId(event.target.value)}
            />
            <Input
              placeholder="Appointment ID (optional)"
              value={effectiveAppointmentId}
              onChange={(event) => setEffectiveAppointmentId(event.target.value)}
            />
          </div>
        ) : null}

        <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
          <div className="rounded border p-2">
            Position grants: {selectedPositionId ? currentScopePermissionIds.length : 0}
          </div>
          <div className="rounded border p-2">
            Role grants: {selectedRoleId ? currentScopePermissionIds.length : 'shown after preview'}
          </div>
          <div className="rounded border p-2">
            Field rules: {activeScopeFieldRules.length}
          </div>
        </div>

        {effectiveBundle ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded border p-3 text-sm">
              <div className="font-medium">Principal</div>
              <div className="mt-2 text-xs text-muted-foreground">User: {effectiveBundle.userId}</div>
              <div className="text-xs text-muted-foreground">
                Position: {effectiveBundle.appointment.positionKey ?? '-'}
              </div>
              <div className="text-xs text-muted-foreground">
                Scope: {effectiveBundle.appointment.scopeType ?? '-'} {effectiveBundle.appointment.scopeId ?? ''}
              </div>
            </div>
            <div className="rounded border p-3 text-sm">
              <div className="font-medium">Roles</div>
              <div className="mt-2 flex max-h-32 flex-wrap gap-1 overflow-auto">
                {effectiveBundle.roles.map((role) => (
                  <span key={role} className="rounded bg-muted px-2 py-0.5 text-xs">
                    {role}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded border p-3 text-sm">
              <div className="font-medium">Summary</div>
              <div className="mt-2 text-xs text-muted-foreground">
                Granted: {effectiveBundle.permissions.length}
              </div>
              <div className="text-xs text-muted-foreground">
                Denied: {effectiveBundle.deniedPermissions.length}
              </div>
              <div className="text-xs text-muted-foreground">
                Policy version: {effectiveBundle.policyVersion}
              </div>
            </div>
            <div className="rounded border p-3 text-sm md:col-span-2">
              <div className="font-medium">Granted Permissions</div>
              <div className="mt-2 max-h-48 whitespace-pre-wrap overflow-auto font-mono text-xs text-muted-foreground">
                {effectiveBundle.permissions.join('\n') || '-'}
              </div>
            </div>
            <div className="rounded border p-3 text-sm">
              <div className="font-medium">Denied / Field Rules</div>
              <div className="mt-2 max-h-48 whitespace-pre-wrap overflow-auto font-mono text-xs text-muted-foreground">
                {[
                  ...effectiveBundle.deniedPermissions,
                  ...Object.keys(effectiveBundle.fieldRulesByAction),
                ].join('\n') || '-'}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      </TabsContent>

      <TabsContent value="field-access" className="space-y-8">
      <section className="rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Field & Module Access</h3>
            <p className="text-sm text-muted-foreground">
              Review the field-level access currently applied to active appointments.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Active appointments: {rbacActiveAppointments.length} | Field rules: {fieldRuleItems.length}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(240px,360px)_1fr]">
          <select
            className="h-9 rounded border bg-background px-2"
            value={fieldAccessAppointmentId}
            onChange={(event) => setFieldAccessAppointmentId(event.target.value)}
          >
            <option value="">All active appointments</option>
            {rbacActiveAppointments.map((appointment) => (
              <option key={appointment.id} value={appointment.id}>
                {appointment.label}
              </option>
            ))}
          </select>
          <div className="rounded border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {selectedRbacAppointment
              ? `${selectedRbacAppointment.username} | ${selectedRbacAppointment.scopeType}${selectedRbacAppointment.scopeId ? `:${selectedRbacAppointment.scopeId}` : ''}`
              : 'Select an appointment to focus the table and configure field access.'}
          </div>
        </div>

        <div className="mt-4 max-h-72 overflow-auto rounded border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="p-2 text-left">Appointment</th>
                <th className="p-2 text-left">Permission</th>
                <th className="p-2 text-left">Mode</th>
                <th className="p-2 text-left">Field</th>
                <th className="p-2 text-left">Source</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointmentFieldAccessRows.map((row, index) => (
                <tr key={`${row.appointment.id}-${row.rule.id}-${row.field}-${index}`} className="border-t">
                  <td className="p-2">{row.appointment.label}</td>
                  <td className="p-2 font-mono">{row.rule.permissionKey}</td>
                  <td className="p-2">{row.rule.mode}</td>
                  <td className="p-2 font-mono">{row.field}</td>
                  <td className="p-2">{row.source}</td>
                </tr>
              ))}
              {filteredAppointmentFieldAccessRows.length === 0 ? (
                <tr>
                  <td className="p-4 text-center text-muted-foreground" colSpan={5}>
                    No field-level rules are currently applied for this appointment filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Configure Field & Module Access</h3>
            <p className="text-sm text-muted-foreground">
              Select an active appointment, choose module fields, and save read/write access.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Fields: {filteredFieldCatalog.length} / {fieldCatalog.length}
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-[minmax(240px,360px)_180px_1fr]">
          <select
            className="h-9 rounded border bg-background px-2"
            value={fieldAccessAppointmentId}
            onChange={(event) => setFieldAccessAppointmentId(event.target.value)}
          >
            <option value="">Select active appointment</option>
            {rbacActiveAppointments.map((appointment) => (
              <option key={appointment.id} value={appointment.id}>
                {appointment.label}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded border bg-background px-2"
            value={fieldCatalogModuleFilter}
            onChange={(event) => setFieldCatalogModuleFilter(event.target.value)}
          >
            <option value="all">All modules</option>
            {fieldCatalogModules.map((moduleLabel) => (
              <option key={moduleLabel} value={moduleLabel}>
                {moduleLabel}
              </option>
            ))}
          </select>
          <Input
            placeholder="Search fields, tables, resources"
            value={fieldCatalogSearch}
            onChange={(event) => setFieldCatalogSearch(event.target.value)}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allowSelectedRead}
              onChange={(event) => setAllowSelectedRead(event.target.checked)}
            />
            Allow read
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allowSelectedWrite}
              onChange={(event) => setAllowSelectedWrite(event.target.checked)}
            />
            Allow write
          </label>
          <Button type="button" size="sm" variant="outline" onClick={selectVisibleFields}>
            Select visible
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={clearSelectedFields}>
            Clear selected
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!fieldAccessAppointmentId || selectedFieldIds.length === 0 || fieldAccessSaving}
            onClick={handleSaveAppointmentFieldAccess}
          >
            {fieldAccessSaving ? 'Saving...' : `Save ${selectedFieldIds.length} field${selectedFieldIds.length === 1 ? '' : 's'}`}
          </Button>
          <span className="text-xs text-muted-foreground">
            Unchecked read/write restricts the selected fields for this appointment.
          </span>
        </div>

        <div className="mt-4 max-h-96 overflow-auto rounded border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="p-2 text-left">Select</th>
                <th className="p-2 text-left">Module</th>
                <th className="p-2 text-left">Field</th>
                <th className="p-2 text-left">Table</th>
                <th className="p-2 text-left">Read</th>
                <th className="p-2 text-left">Write</th>
              </tr>
            </thead>
            <tbody>
              {filteredFieldCatalog.slice(0, 500).map((field) => {
                const readAvailable = Boolean(field.readPermissionKey && permissionIdByKey.has(field.readPermissionKey));
                const writeAvailable = field.writePermissionKeys.some((key) => permissionIdByKey.has(key));
                return (
                  <tr key={field.id} className="border-t">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedFieldIdSet.has(field.id)}
                        disabled={!readAvailable && !writeAvailable}
                        onChange={() => toggleFieldSelection(field.id)}
                      />
                    </td>
                    <td className="p-2">
                      <div className="font-medium">{field.moduleLabel}</div>
                      <div className="text-muted-foreground">{field.areaLabel}</div>
                    </td>
                    <td className="p-2">
                      <div>{field.fieldLabel}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{field.fieldName}</div>
                    </td>
                    <td className="p-2 font-mono">{field.tableName}</td>
                    <td className="p-2 font-mono">{readAvailable ? field.readPermissionKey : '-'}</td>
                    <td className="p-2 font-mono">
                      {writeAvailable ? field.writePermissionKeys.filter((key) => permissionIdByKey.has(key)).join(', ') : '-'}
                    </td>
                  </tr>
                );
              })}
              {filteredFieldCatalog.length === 0 ? (
                <tr>
                  <td className="p-4 text-center text-muted-foreground" colSpan={6}>
                    No fields match this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <details className="rounded-lg border p-4">
        <summary className="cursor-pointer text-sm font-semibold">Advanced field rules</summary>
        <div className="mt-4">
        <h3 className="text-lg font-semibold">Field Rules</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Configure field-level control (`ALLOW`, `DENY`, `OMIT`, `MASK`) per permission/action.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>Applied rules: {fieldRuleItems.length}</span>
          <span>Default rules: {fieldRuleDefaults.length}</span>
          <span>Missing defaults: {missingDefaultFieldRules.length}</span>
          <span>Custom rules: {fieldRuleItems.filter((rule) => rule.customRule !== false).length}</span>
          <Button type="button" size="sm" variant="outline" disabled={fieldRuleDefaults.length === 0}>
            {fieldRuleDefaults.length === 0 ? 'No default field rules defined' : 'Apply default field rules'}
          </Button>
        </div>

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
              {fieldRuleItems.map((rule) => (
                <tr key={rule.id} className="border-t">
                  <td className="p-2 font-mono">{rule.permissionKey}</td>
                  <td className="p-2">{rule.positionKey ?? rule.roleKey ?? '-'}</td>
                  <td className="p-2">
                    <div>{rule.mode}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {rule.defaultRule ? 'Default rule' : 'Custom rule'}
                    </div>
                  </td>
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
        </div>
      </details>
      </TabsContent>
    </Tabs>
  );
}
