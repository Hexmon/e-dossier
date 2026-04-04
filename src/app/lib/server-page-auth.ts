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
  resolveModuleAccessForUser,
  type ModuleAccessKey,
  type ResolvedModuleAccess,
} from "@/app/lib/module-access";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type AdminPageAuthContext = {
  userId: string;
  roles: string[];
  roleGroup: SidebarRoleGroup;
  position: string | null;
  moduleAccess: ResolvedModuleAccess;
};

export async function requireDashboardAccess(): Promise<AdminPageAuthContext> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    redirect("/login");
  }

  let payload: Awaited<ReturnType<typeof verifyAccessJWT>>;
  try {
    payload = await verifyAccessJWT(accessToken);
  } catch {
    redirect("/login");
  }

  const userId = String(payload.sub ?? "");
  if (!userId) {
    redirect("/login");
  }

  const roles = Array.isArray(payload.roles)
    ? payload.roles.filter((role): role is string => typeof role === "string")
    : [];
  const position =
    typeof (payload as any).apt?.position === "string" ? (payload as any).apt.position : null;
  const roleGroup = deriveSidebarRoleGroup({ roles, position });
  const moduleAccess = await resolveModuleAccessForUser({
    userId,
    roles,
    position,
  });

  return {
    userId,
    roles,
    roleGroup,
    position,
    moduleAccess,
  };
}

export async function requireAdminDashboardAccess(): Promise<AdminPageAuthContext> {
  return requireDashboardSectionAccess("admin");
}

export async function requireSuperAdminDashboardAccess(): Promise<AdminPageAuthContext> {
  const authContext = await requireDashboardAccess();

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

  if (!hasResolvedSectionAccess(authContext.moduleAccess, sectionKey)) {
    redirect("/dashboard");
  }

  return authContext;
}

export async function requireDashboardModuleAccess(
  moduleKey: ModuleAccessKey
): Promise<AdminPageAuthContext> {
  const authContext = await requireDashboardAccess();

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

  if (!canAccessBulkWorkflowModule(authContext.moduleAccess, workflowModule)) {
    redirect("/dashboard");
  }

  return authContext;
}
