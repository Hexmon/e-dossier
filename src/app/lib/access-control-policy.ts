type PathRule = {
  path: string;
  exact?: boolean;
};

const PUBLIC_API_ANY_RULES: readonly PathRule[] = [
  { path: "/api/v1/auth/login", exact: true },
  { path: "/api/v1/auth/signup", exact: true },
  { path: "/api/v1/auth/logout", exact: true },
  { path: "/api/v1/health", exact: true },
  { path: "/api/v1/bootstrap/super-admin", exact: true },
];

const PUBLIC_API_METHOD_RULES: Readonly<Record<string, readonly PathRule[]>> = {
  GET: [
    // Login needs active appointment identities before a user has a token.
    // The route handler forces anonymous callers into active-only public projection mode.
    { path: "/api/v1/admin/appointments", exact: true },
    // Dossier inspection and appointment selectors need user/position lookups across roles.
    // Route handlers return dropdown-safe public projections for non-privileged callers.
    { path: "/api/v1/admin/positions", exact: true },
    { path: "/api/v1/admin/users", exact: true },
    { path: "/api/v1/platoons" },
    { path: "/api/v1/site-settings" },
    { path: "/api/v1/setup/status", exact: true },
  ],
};

export type PublicApiRule = PathRule & {
  method: "ANY" | "GET";
};

export const PUBLIC_API_REGISTRY: readonly PublicApiRule[] = [
  ...PUBLIC_API_ANY_RULES.map((rule) => ({ ...rule, method: "ANY" as const })),
  ...PUBLIC_API_METHOD_RULES.GET.map((rule) => ({ ...rule, method: "GET" as const })),
];

const SHARED_AUTHENTICATED_ADMIN_METHOD_RULES: Readonly<Record<string, readonly PathRule[]>> = {
  GET: [
    // Bulk academics/PT pages are intentionally available to platoon-scoped actors in the
    // current runtime. These read-only course lookups must stay reachable to authenticated
    // users even though they live under /api/v1/admin/*.
    { path: "/api/v1/admin/courses" },
    // PL CDR flows read shared admin-owned configuration and template data from these modules.
    // Keep only GET shared; write methods remain admin-protected.
    { path: "/api/v1/admin/interview" },
    { path: "/api/v1/admin/punishments", exact: true },
    { path: "/api/v1/admin/physical-training" },
    { path: "/api/v1/admin/training-camps" },
  ],
};

export function matchPathRule(pathname: string, rule: PathRule): boolean {
  if (rule.exact) {
    return pathname === rule.path;
  }

  return pathname === rule.path || pathname.startsWith(`${rule.path}/`);
}

export function isPublicApiPath(pathname: string, method: string): boolean {
  if (!pathname.startsWith("/api/v1/")) {
    return true;
  }

  if (PUBLIC_API_ANY_RULES.some((rule) => matchPathRule(pathname, rule))) {
    return true;
  }

  const rules = PUBLIC_API_METHOD_RULES[method.toUpperCase()] ?? [];
  return rules.some((rule) => matchPathRule(pathname, rule));
}

export function isAdminApiPath(pathname: string): boolean {
  return pathname === "/api/v1/admin" || pathname.startsWith("/api/v1/admin/");
}

export function isSharedAuthenticatedAdminApiPath(pathname: string, method: string): boolean {
  if (!isAdminApiPath(pathname)) {
    return false;
  }

  const rules = SHARED_AUTHENTICATED_ADMIN_METHOD_RULES[method.toUpperCase()] ?? [];
  return rules.some((rule) => matchPathRule(pathname, rule));
}

export function isProtectedAdminApiPath(pathname: string, method: string): boolean {
  return (
    isAdminApiPath(pathname) &&
    !isPublicApiPath(pathname, method) &&
    !isSharedAuthenticatedAdminApiPath(pathname, method)
  );
}
