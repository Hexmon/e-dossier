import { verifyAccessJWT } from "@/app/lib/jwt";
import {
  deriveSidebarRoleGroup,
  type SidebarRoleGroup,
  type SidebarSectionKey,
} from "@/lib/sidebar-visibility";
import {
  canAccessBulkWorkflowModule,
  canAccessModule,
  hasResolvedSectionAccess,
  resolveSidebarSectionForDashboardPath,
  resolveModuleAccessForUser,
  type ModuleAccessKey,
  type ResolvedModuleAccess,
} from "@/app/lib/module-access";
import { assertActiveAuthorityFromPayload } from "@/app/lib/active-authority";
import { db } from "@/app/db/client";
import { ocCadets } from "@/app/db/schema/training/oc";
import { getSetupStatus, isSetupStatusUnavailable } from "@/app/lib/setup-status";
import {
  isSetupDashboardPath,
  isSetupManagerRoleGroup,
} from "@/app/lib/setup-gate";
import { hasScopeAccess } from "@/lib/authorization";
import { canManageCadetAppointments } from "@/lib/platoon-commander-access";
import { isAuthzV2Enabled } from "@/app/lib/acx/feature-flag";
import { resolvePageAction } from "@/app/lib/acx/action-map";
import { getEffectivePermissionBundleCached } from "@/app/db/queries/authz-permissions";
import { and, eq, isNull } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

type AdminPageAuthContext = {
  userId: string;
  roles: string[];
  roleGroup: SidebarRoleGroup;
  position: string | null;
  scopeType: string | null;
  scopeId: string | null;
  moduleAccess: ResolvedModuleAccess;
  permissions: string[];
  deniedPermissions: string[];
};

async function buildDashboardAuthContext(
  accessToken: string | null | undefined
): Promise<AdminPageAuthContext | null> {
  if (!accessToken) {
    return null;
  }

  let payload: Awaited<ReturnType<typeof verifyAccessJWT>>;
  try {
    payload = await verifyAccessJWT(accessToken);
    await assertActiveAuthorityFromPayload(payload as Record<string, any>);
  } catch {
    return null;
  }

  const userId = String(payload.sub ?? "");
  if (!userId) {
    return null;
  }

  const roles = Array.isArray(payload.roles)
    ? payload.roles.filter((role): role is string => typeof role === "string")
    : [];
  const position =
    typeof (payload as any).apt?.position === "string" ? (payload as any).apt.position : null;
  const scopeType =
    typeof (payload as any).apt?.scope?.type === "string" ? (payload as any).apt.scope.type : null;
  const scopeId =
    (payload as any).apt?.scope?.id == null ? null : String((payload as any).apt.scope.id);
  const roleGroup = deriveSidebarRoleGroup({ roles, position });
  const [moduleAccess, authzBundle] = await Promise.all([
    resolveModuleAccessForUser({
      userId,
      roles,
      position,
    }),
    isAuthzV2Enabled()
      ? getEffectivePermissionBundleCached({
          userId,
          roles,
          apt: (payload as any).apt,
        })
      : Promise.resolve(null),
  ]);

  return {
    userId,
    roles,
    roleGroup,
    position,
    scopeType,
    scopeId,
    moduleAccess,
    permissions: authzBundle?.permissions ?? [],
    deniedPermissions: authzBundle?.deniedPermissions ?? [],
  };
}

export async function getOptionalDashboardAccess(): Promise<AdminPageAuthContext | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return buildDashboardAuthContext(accessToken);
}

async function getCurrentPathname(): Promise<string | null> {
  const headerStore = await headers();
  return headerStore.get("x-pathname") ?? headerStore.get("x-next-pathname") ?? null;
}

async function enforceInitialSetupDashboardGate(authContext: AdminPageAuthContext) {
  const setupStatus = await getSetupStatus();

  if (setupStatus.setupComplete || isSetupStatusUnavailable(setupStatus)) {
    return;
  }

  const pathname = await getCurrentPathname();

  if (!isSetupManagerRoleGroup(authContext.roleGroup) || !isSetupDashboardPath(pathname)) {
    redirect("/setup");
  }
}

export async function requireDashboardAccess(): Promise<AdminPageAuthContext> {
  const authContext = await getOptionalDashboardAccess();

  if (!authContext) {
    redirect("/login");
  }

  await enforceInitialSetupDashboardGate(authContext);
  await enforceDashboardPagePermission(authContext);

  return authContext;
}

async function enforceDashboardPagePermission(authContext: AdminPageAuthContext) {
  if (!isAuthzV2Enabled()) return;

  const pathname = await getCurrentPathname();
  if (!pathname) {
    redirect("/dashboard");
  }
  if (pathname === "/dashboard") return;

  const page = resolvePageAction(pathname);
  if (!page) {
    redirect("/dashboard");
  }

  if (
    pathname === "/dashboard/settings/device/appointments" &&
    authContext.scopeId &&
    canManageCadetAppointments({
      roles: authContext.roles,
      position: authContext.position,
      scopeType: authContext.scopeType,
    })
  ) {
    return;
  }

  if (authContext.roleGroup === "SUPER_ADMIN") return;

  const sectionKey = resolveSidebarSectionForDashboardPath(pathname);
  if (sectionKey && !hasResolvedSectionAccess(authContext.moduleAccess, sectionKey)) {
    redirect("/dashboard");
  }

  const permissions = new Set(authContext.permissions);
  const deniedPermissions = new Set(authContext.deniedPermissions);
  if (permissions.has("*")) return;
  if (deniedPermissions.has(page.action)) {
    redirect("/dashboard");
  }
  if (!permissions.has(page.action)) {
    redirect("/dashboard");
  }
}

export async function requireAdminDashboardAccess(): Promise<AdminPageAuthContext> {
  if (isAuthzV2Enabled()) {
    return requireDashboardAccess();
  }
  return requireDashboardSectionAccess("admin");
}

export async function requireSuperAdminDashboardAccess(): Promise<AdminPageAuthContext> {
  const authContext = await requireDashboardAccess();

  if (isAuthzV2Enabled()) {
    return authContext;
  }

  if (authContext.roleGroup !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return authContext;
}

export async function requireNonAdminDashboardAccess(): Promise<AdminPageAuthContext> {
  const authContext = await requireDashboardAccess();

  if (authContext.roleGroup !== "OTHER_USERS") {
    redirect("/dashboard");
  }

  return authContext;
}

export async function requireDashboardSectionAccess(
  sectionKey: SidebarSectionKey
): Promise<AdminPageAuthContext> {
  const authContext = await requireDashboardAccess();

  if (isAuthzV2Enabled()) {
    return authContext;
  }

  if (!hasResolvedSectionAccess(authContext.moduleAccess, sectionKey)) {
    redirect("/dashboard");
  }

  return authContext;
}

export async function requireDashboardModuleAccess(
  moduleKey: ModuleAccessKey
): Promise<AdminPageAuthContext> {
  const authContext = await requireDashboardAccess();

  if (isAuthzV2Enabled()) {
    return authContext;
  }

  if (!canAccessModule(authContext.moduleAccess, moduleKey)) {
    redirect("/dashboard");
  }

  return authContext;
}

export async function requireDashboardBulkHubAccess(): Promise<AdminPageAuthContext> {
  return requireDashboardModuleAccess("BULK_UPLOAD");
}

export async function requireDashboardBulkWorkflowAccess(
  workflowModule: "ACADEMICS_BULK" | "PT_BULK"
): Promise<AdminPageAuthContext> {
  const authContext = await requireDashboardAccess();

  if (isAuthzV2Enabled()) {
    return authContext;
  }

  if (!canAccessBulkWorkflowModule(authContext.moduleAccess, workflowModule)) {
    redirect("/dashboard");
  }

  return authContext;
}

export async function requirePlatoonCommanderDashboardAccess(): Promise<AdminPageAuthContext> {
  const authContext = await requireDashboardAccess();

  if (
    !canManageCadetAppointments({
      roles: authContext.roles,
      position: authContext.position,
      scopeType: authContext.scopeType,
    }) ||
    !authContext.scopeId
  ) {
    redirect("/dashboard");
  }

  return authContext;
}

export async function requireDashboardOcModuleAccess(
  ocId: string,
  moduleKey: ModuleAccessKey
): Promise<AdminPageAuthContext> {
  const authContext = await requireDashboardModuleAccess(moduleKey);

  const [oc] = await db
    .select({ id: ocCadets.id, platoonId: ocCadets.platoonId })
    .from(ocCadets)
    .where(and(eq(ocCadets.id, ocId), isNull(ocCadets.deletedAt)))
    .limit(1);

  if (!oc) {
    notFound();
  }

  if (authContext.roleGroup === "SUPER_ADMIN" || authContext.roleGroup === "ADMIN") {
    return authContext;
  }

  const canAccessOc = Boolean(
    oc.platoonId &&
      hasScopeAccess(
        {
          userId: authContext.userId,
          roles: authContext.roles,
          apt: authContext.scopeType
            ? {
                id: "",
                position: authContext.position ?? "",
                scope: {
                  type: authContext.scopeType,
                  id: authContext.scopeId,
                },
              }
            : null,
        },
        { type: "PLATOON", id: oc.platoonId }
      )
  );

  if (!canAccessOc) {
    redirect("/dashboard");
  }

  return authContext;
}
