import { verifyAccessJWT } from "@/app/lib/jwt";
import { deriveSidebarRoleGroup, type SidebarRoleGroup } from "@/lib/sidebar-visibility";
import { canManageCadetAppointments } from "@/lib/platoon-commander-access";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type AdminPageAuthContext = {
  userId: string;
  roles: string[];
  roleGroup: SidebarRoleGroup;
  position: string | null;
  scopeType: string | null;
  scopeId: string | null;
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
  const scopeType =
    typeof (payload as any).apt?.scope?.type === "string"
      ? (payload as any).apt.scope.type
      : null;
  const scopeId =
    typeof (payload as any).apt?.scope?.id === "string"
      ? (payload as any).apt.scope.id
      : null;
  const roleGroup = deriveSidebarRoleGroup({ roles, position });

  return {
    userId,
    roles,
    roleGroup,
    position,
    scopeType,
    scopeId,
  };
}

export async function requireAdminDashboardAccess(): Promise<AdminPageAuthContext> {
  const authContext = await requireDashboardAccess();

  if (authContext.roleGroup === "OTHER_USERS") {
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
