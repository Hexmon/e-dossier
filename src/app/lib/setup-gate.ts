import { ApiError } from "@/app/lib/http";
import { getSetupStatus, type SetupStatus } from "@/app/lib/setup-status";
import type { SidebarRoleGroup } from "@/lib/sidebar-visibility";

export const SETUP_INCOMPLETE_ERROR = "setup_incomplete";
export const SETUP_INCOMPLETE_MESSAGE =
  "Initial setup is incomplete. An ADMIN or SUPER_ADMIN must complete setup before this action is available.";

type PathRule = {
  path?: string;
  exact?: boolean;
  methods?: readonly string[];
  pattern?: RegExp;
};

const SETUP_DASHBOARD_RULES: readonly PathRule[] = [
  { path: "/dashboard/genmgmt/platoon-management" },
  { path: "/dashboard/genmgmt/usersmgmt" },
  { path: "/dashboard/genmgmt/appointmentmgmt" },
  { path: "/dashboard/genmgmt/hierarchy" },
  { path: "/dashboard/genmgmt/coursemgmt" },
  { path: "/dashboard/genmgmt/subjectmgmt" },
  { path: "/dashboard/genmgmt/ocmgmt" },
  { path: "/dashboard/help/setup-guide", exact: true },
];

const SETUP_AUTHENTICATED_API_RULES: readonly PathRule[] = [
  { path: "/api/v1/me" },
  { path: "/api/v1/settings/device-site" },
  { path: "/api/v1/admin/device-site-settings", methods: ["GET"] },
  { path: "/api/v1/admin/bootstrap/templates/apply" },
  { path: "/api/v1/admin/courses" },
  { path: "/api/v1/admin/hierarchy/nodes" },
  { path: "/api/v1/admin/hierarchy/functional-role-mappings" },
  { path: "/api/v1/admin/instructors", methods: ["GET"] },
  { path: "/api/v1/admin/appointments" },
  { path: "/api/v1/admin/positions" },
  { path: "/api/v1/admin/users" },
  { pattern: /^\/api\/v1\/admin\/platoons\/[^/]+\/commander-history$/, methods: ["GET"] },
  { path: "/api/v1/admin/subjects" },
  { path: "/api/v1/platoons" },
  { pattern: /^\/api\/v1\/oc(?:\/[^/]+)?$/ },
  { path: "/api/v1/oc/bulk-upload", exact: true },
];

function methodMatches(rule: PathRule, method: string) {
  if (!rule.methods) {
    return true;
  }

  return rule.methods.includes(method.toUpperCase());
}

function pathMatches(pathname: string, rule: PathRule) {
  if (rule.pattern) {
    return rule.pattern.test(pathname);
  }

  if (!rule.path) {
    return false;
  }

  if (rule.exact) {
    return pathname === rule.path;
  }

  return pathname === rule.path || pathname.startsWith(`${rule.path}/`);
}

function matchesRule(pathname: string, method: string, rule: PathRule) {
  return methodMatches(rule, method) && pathMatches(pathname, rule);
}

export function isSetupManagerRoleGroup(roleGroup: SidebarRoleGroup | null | undefined) {
  return roleGroup === "ADMIN" || roleGroup === "SUPER_ADMIN";
}

export function isSetupDashboardPath(pathname: string | null | undefined) {
  return Boolean(
    pathname &&
      SETUP_DASHBOARD_RULES.some((rule) => matchesRule(pathname, "GET", rule))
  );
}

export function isSetupAuthenticatedApiPath(pathname: string, method: string) {
  return SETUP_AUTHENTICATED_API_RULES.some((rule) => matchesRule(pathname, method, rule));
}

export function createSetupIncompleteError(
  setupStatus?: Pick<SetupStatus, "nextStep" | "setupComplete">
) {
  return new ApiError(423, SETUP_INCOMPLETE_MESSAGE, SETUP_INCOMPLETE_ERROR, {
    setupComplete: setupStatus?.setupComplete ?? false,
    nextStep: setupStatus?.nextStep ?? null,
  });
}

export async function assertApiAllowedDuringSetup(params: {
  pathname: string;
  method: string;
  roleGroup: SidebarRoleGroup;
}) {
  const setupStatus = await getSetupStatus();

  if (setupStatus.setupComplete) {
    return setupStatus;
  }

  if (
    !isSetupManagerRoleGroup(params.roleGroup) ||
    !isSetupAuthenticatedApiPath(params.pathname, params.method)
  ) {
    throw createSetupIncompleteError(setupStatus);
  }

  return setupStatus;
}

export async function assertLoginAllowedDuringSetup(roleGroup: SidebarRoleGroup) {
  const setupStatus = await getSetupStatus();

  if (setupStatus.setupComplete || isSetupManagerRoleGroup(roleGroup)) {
    return setupStatus;
  }

  throw createSetupIncompleteError(setupStatus);
}

export async function assertSignupAllowedDuringSetup() {
  const setupStatus = await getSetupStatus();

  if (setupStatus.setupComplete) {
    return setupStatus;
  }

  throw createSetupIncompleteError(setupStatus);
}
