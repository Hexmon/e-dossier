import { verifyAccessJWT } from "@/app/lib/jwt";
import { deriveSidebarRoleGroup, type SidebarRoleGroup } from "@/lib/sidebar-visibility";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type AdminPageAuthContext = {
  userId: string;
  roles: string[];
  roleGroup: SidebarRoleGroup;
  position: string | null;
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

  return {
    userId,
    roles,
    roleGroup,
    position,
  };
}

export async function requireAdminDashboardAccess(): Promise<AdminPageAuthContext> {
  const authContext = await requireDashboardAccess();

  if (authContext.roleGroup === "OTHER_USERS") {
    redirect("/dashboard");
  }

  return authContext;
}
