import { API_ACTION_MAP, PAGE_ACTION_MAP } from "@/app/lib/acx/action-map";
import {
  INTERVIEW_WRITE_PERMISSION_KEYS,
} from "@/lib/interview-access";

export type RbacDefaultProfile = {
  key: string;
  label: string;
  roleKeys: string[];
  positionKeys: string[];
  permissionKeys: string[];
  protected?: boolean;
};

export const RBAC_WILDCARD_PERMISSION = "*";

export const RBAC_SIDEBAR_PERMISSION_KEYS = [
  "sidebar:dossier",
  "sidebar:reports",
  "sidebar:bulk-upload",
] as const;

const MANAGE_MARKS_API_PATHS = new Set<string>([
  "/api/v1/admin/courses",
  "/api/v1/admin/courses/:courseId/offerings",
  "/api/v1/admin/courses/:courseId/offerings/assign",
  "/api/v1/oc",
]);

const ADMIN_EXTRA_PERMISSION_KEYS = [
  "admin:rbac:permissions:read",
  "admin:rbac:permissions:create",
  "admin:rbac:permissions:update",
  "admin:rbac:permissions:delete",
  "admin:rbac:mappings:read",
  "admin:rbac:mappings:update",
  "admin:rbac:field-rules:read",
  "admin:rbac:field-rules:create",
  "admin:rbac:field-rules:update",
  "admin:rbac:field-rules:delete",
  "admin:rbac:roles:read",
  "admin:rbac:roles:create",
  "admin:rbac:roles:update",
  "admin:rbac:roles:delete",
  "admin:rbac:effective:read",
  "page:dashboard:genmgmt:rbac:view",
] as const;

const COMMON_NAVIGATION_PERMISSION_KEYS = [
  "page:dashboard:view",
  "page:dashboard:help:view",
  "page:dashboard:help:admin-operations:view",
  "page:dashboard:help:bulk-upload:view",
  "page:dashboard:help:deployment-environment:view",
  "page:dashboard:help:dossier-management:view",
  "page:dashboard:help:general-management:view",
  "page:dashboard:help:module-management:view",
  "page:dashboard:help:org-templates:view",
  "page:dashboard:help:org-templates:grading-policy:view",
  "page:dashboard:help:org-templates:olq:view",
  "page:dashboard:help:org-templates:physical-training:view",
  "page:dashboard:help:rbac-permissions:view",
  "page:dashboard:help:reports:view",
  "page:dashboard:help:settings-controls:view",
  "page:dashboard:help:setup-guide:view",
  "page:dashboard:help:software-overview:view",
  "page:dashboard:settings:view",
  "page:dashboard:settings:device:view",
] as const;

export const PLATOON_COMMANDER_DEFAULT_PERMISSION_KEYS = [
  "page:dashboard:manage-marks:view",
  "page:dashboard:manage-pt-marks:view",
  "page:dashboard:milmgmt:view",
  "page:dashboard:milmgmt:academics:view",
  "page:dashboard:milmgmt:physical-training:view",
  "page:dashboard:reports:view",
  "admin:courses:read",
  "admin:courses:offerings:read",
  "admin:punishments:read",
  "admin:physical-training:templates:read",
  "oc:read",
  "platoons:read",
  "oc:academics:read",
  "oc:academics:bulk:read",
  "oc:academics:bulk:create",
  "oc:physical-training:read",
  "oc:physical-training:motivation-awards:read",
  "oc:physical-training:bulk:read",
  "oc:physical-training:bulk:create",
  "sidebar:dossier",
  "sidebar:reports",
  "sidebar:bulk-upload",
] as const;

function uniqueSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).filter(Boolean).sort();
}

export function getAllMappedActionKeys(): string[] {
  return uniqueSorted([
    ...API_ACTION_MAP.map((entry) => entry.action),
    ...PAGE_ACTION_MAP.map((entry) => entry.action),
    ...ADMIN_EXTRA_PERMISSION_KEYS,
    ...INTERVIEW_WRITE_PERMISSION_KEYS,
    ...RBAC_SIDEBAR_PERMISSION_KEYS,
    RBAC_WILDCARD_PERMISSION,
  ]);
}

export function getAdminDefaultPermissionKeys(): string[] {
  return uniqueSorted([
    ...API_ACTION_MAP.filter(
      (entry) => entry.adminBaseline || MANAGE_MARKS_API_PATHS.has(entry.path)
    ).map((entry) => entry.action),
    ...PAGE_ACTION_MAP.filter((entry) => entry.adminBaseline).map((entry) => entry.action),
    ...COMMON_NAVIGATION_PERMISSION_KEYS,
    ...ADMIN_EXTRA_PERMISSION_KEYS,
    ...INTERVIEW_WRITE_PERMISSION_KEYS,
  ]);
}

export function getPlatoonCommanderDefaultPermissionKeys(): string[] {
  return uniqueSorted([
    ...PLATOON_COMMANDER_DEFAULT_PERMISSION_KEYS,
    ...COMMON_NAVIGATION_PERMISSION_KEYS,
    ...INTERVIEW_WRITE_PERMISSION_KEYS,
  ]);
}

export function getRbacDefaultProfiles(): RbacDefaultProfile[] {
  const adminDefaults = getAdminDefaultPermissionKeys();
  const platoonDefaults = getPlatoonCommanderDefaultPermissionKeys();
  const allDefaults = getAllMappedActionKeys();

  return [
    {
      key: "super_admin",
      label: "Super Admin",
      roleKeys: ["super_admin"],
      positionKeys: ["SUPER_ADMIN"],
      permissionKeys: allDefaults,
      protected: true,
    },
    {
      key: "admin",
      label: "Admin",
      roleKeys: ["admin"],
      positionKeys: ["ADMIN"],
      permissionKeys: adminDefaults,
    },
    {
      key: "commandant",
      label: "Commandant",
      roleKeys: ["commandant"],
      positionKeys: ["COMMANDANT"],
      permissionKeys: adminDefaults,
    },
    {
      key: "platoon_commander",
      label: "Platoon Commander",
      roleKeys: ["platoon_commander"],
      positionKeys: ["PLATOON_COMMANDER"],
      permissionKeys: platoonDefaults,
    },
    {
      key: "platoon_commander_equivalent",
      label: "Platoon Commander Equivalent",
      roleKeys: ["platoon_commander_equivalent"],
      positionKeys: ["PLATOON_COMMANDER_EQUIVALENT"],
      permissionKeys: platoonDefaults,
    },
  ];
}

export function getDefaultPermissionKeys(): string[] {
  return uniqueSorted(getRbacDefaultProfiles().flatMap((profile) => profile.permissionKeys));
}

export function isSystemPermissionKey(key: string): boolean {
  return getAllMappedActionKeys().includes(key);
}

export function isDefaultPermissionKey(key: string): boolean {
  return getDefaultPermissionKeys().includes(key);
}

export function getPermissionSystemMeta(key: string): { system: boolean; defaultGrant: boolean } {
  return {
    system: isSystemPermissionKey(key),
    defaultGrant: isDefaultPermissionKey(key),
  };
}

export function normalizeRbacKey(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
}
