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

function uniqueSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).filter(Boolean).sort();
}

export const RBAC_SIDEBAR_PERMISSION_KEYS = [
  "sidebar:dossier",
  "sidebar:reports",
  "sidebar:bulk-upload",
] as const;

export const AUTHENTICATED_DASHBOARD_PERMISSION_KEYS = [
  "me:read",
  "me:navigation:read",
  "me:device-site-settings:read",
  "me:workflow-notifications:read",
  "me:workflow-notifications:update",
  "dashboard:data:appointments:read",
  "dashboard:data:course:read",
  "dashboard:data:platoon:read",
] as const;

const ADMIN_SECTION_SUPPORT_API_PATHS = new Set<string>([
  "/api/v1/admin/courses",
  "/api/v1/admin/courses/:courseId/offerings",
  "/api/v1/admin/courses/:courseId/offerings/assign",
  "/api/v1/oc",
]);

const BULK_UPLOAD_API_PATHS = new Set<string>([
  "/api/v1/oc/academics/bulk",
  "/api/v1/oc/academics/workflow",
  "/api/v1/oc/physical-training/bulk",
  "/api/v1/oc/physical-training/workflow",
  "/api/v1/oc/bulk-upload",
]);

const SHARED_COURSE_OC_READ_PERMISSION_KEYS = [
  "admin:courses:read",
  "admin:courses:offerings:read",
  "oc:read",
  "platoons:read",
] as const;

const DOSSIER_SUPPORT_PERMISSION_KEYS = [
  ...SHARED_COURSE_OC_READ_PERMISSION_KEYS,
  "admin:interview:templates:read",
  "admin:interview:templates:fields:read",
  "admin:interview:templates:fields:options:read",
  "admin:interview:templates:groups:read",
  "admin:interview:templates:groups:fields:read",
  "admin:interview:templates:sections:read",
  "admin:interview:templates:sections:fields:read",
  "admin:interview:templates:semesters:read",
  "admin:physical-training:templates:read",
  "admin:punishments:read",
] as const;

const BULK_UPLOAD_SUPPORT_PERMISSION_KEYS = [
  ...SHARED_COURSE_OC_READ_PERMISSION_KEYS,
  "admin:physical-training:templates:read",
  "admin:physical-training:types:read",
] as const;

const REPORTS_SUPPORT_PERMISSION_KEYS = [
  "admin:courses:read",
  "admin:courses:offerings:read",
  "admin:physical-training:types:read",
] as const;

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
] as const;

const ADMIN_DEVICE_SETTINGS_PERMISSION_KEYS = [
  "page:dashboard:settings:view",
  "page:dashboard:settings:device:view",
  "page:dashboard:settings:device:appointments:view",
  "settings:device-site:read",
  "settings:device-site:update",
  "admin:device-site-settings:read",
  "admin:device-site-settings:update",
] as const;

const REPORTS_PERMISSION_KEYS = [
  "sidebar:reports",
  ...REPORTS_SUPPORT_PERMISSION_KEYS,
  ...PAGE_ACTION_MAP.filter((entry) => entry.action === "page:dashboard:reports:view").map(
    (entry) => entry.action
  ),
  ...API_ACTION_MAP.filter((entry) => entry.resourceType.startsWith("reports:")).map(
    (entry) => entry.action
  ),
] as const;

const BULK_UPLOAD_PERMISSION_KEYS = [
  "sidebar:bulk-upload",
  "page:dashboard:bulk-upload:view",
  "page:dashboard:manage-marks:view",
  "page:dashboard:manage-pt-marks:view",
  ...BULK_UPLOAD_SUPPORT_PERMISSION_KEYS,
  ...API_ACTION_MAP.filter((entry) => BULK_UPLOAD_API_PATHS.has(entry.path)).map(
    (entry) => entry.action
  ),
] as const;

const DOSSIER_PERMISSION_KEYS = [
  "sidebar:dossier",
  ...PAGE_ACTION_MAP.filter((entry) => entry.resourceType.startsWith("page:dashboard:milmgmt")).map(
    (entry) => entry.action
  ),
  ...DOSSIER_SUPPORT_PERMISSION_KEYS,
  ...API_ACTION_MAP.filter(
    (entry) =>
      entry.resourceType.startsWith("oc:") &&
      !entry.resourceType.startsWith("oc:academics:bulk") &&
      !entry.resourceType.startsWith("oc:academics:workflow") &&
      !entry.resourceType.startsWith("oc:physical-training:bulk") &&
      !entry.resourceType.startsWith("oc:physical-training:workflow") &&
      entry.resourceType !== "oc:bulk-upload"
  ).map((entry) => entry.action),
] as const;

const ADMIN_SECTION_PERMISSION_KEYS = [
  ...API_ACTION_MAP.filter(
    (entry) => entry.adminBaseline || ADMIN_SECTION_SUPPORT_API_PATHS.has(entry.path)
  ).map((entry) => entry.action),
  ...PAGE_ACTION_MAP.filter((entry) => entry.adminBaseline).map((entry) => entry.action),
  ...ADMIN_EXTRA_PERMISSION_KEYS,
  ...INTERVIEW_WRITE_PERMISSION_KEYS,
] as const;

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
    ...AUTHENTICATED_DASHBOARD_PERMISSION_KEYS,
    ...COMMON_NAVIGATION_PERMISSION_KEYS,
    ...ADMIN_SECTION_PERMISSION_KEYS,
    ...ADMIN_DEVICE_SETTINGS_PERMISSION_KEYS,
    ...REPORTS_PERMISSION_KEYS,
  ]);
}

export function getPlatoonCommanderDefaultPermissionKeys(): string[] {
  return uniqueSorted([
    ...AUTHENTICATED_DASHBOARD_PERMISSION_KEYS,
    ...COMMON_NAVIGATION_PERMISSION_KEYS,
    ...DOSSIER_PERMISSION_KEYS,
    ...REPORTS_PERMISSION_KEYS,
    ...INTERVIEW_WRITE_PERMISSION_KEYS,
  ]);
}

export function getOtherUserDefaultPermissionKeys(): string[] {
  return uniqueSorted([
    ...AUTHENTICATED_DASHBOARD_PERMISSION_KEYS,
    ...COMMON_NAVIGATION_PERMISSION_KEYS,
    ...REPORTS_PERMISSION_KEYS,
    ...BULK_UPLOAD_PERMISSION_KEYS,
  ]);
}

export function getRbacDefaultProfiles(): RbacDefaultProfile[] {
  const adminDefaults = getAdminDefaultPermissionKeys();
  const platoonDefaults = getPlatoonCommanderDefaultPermissionKeys();
  const otherUserDefaults = getOtherUserDefaultPermissionKeys();
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
      roleKeys: ["platoon_commander", "ptn_cdr"],
      positionKeys: ["PLATOON_COMMANDER", "PTN_CDR"],
      permissionKeys: platoonDefaults,
    },
    {
      key: "platoon_commander_equivalent",
      label: "Platoon Commander Equivalent",
      roleKeys: ["platoon_commander_equivalent"],
      positionKeys: ["PLATOON_COMMANDER_EQUIVALENT"],
      permissionKeys: platoonDefaults,
    },
    {
      key: "other_users",
      label: "Other Users",
      roleKeys: ["guest", "user"],
      positionKeys: ["DEPUTY_COMMANDANT", "HOAT", "DEPUTY_SECRETARY", "CCO"],
      permissionKeys: otherUserDefaults,
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
