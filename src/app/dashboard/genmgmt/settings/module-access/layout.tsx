import type { ReactNode } from "react";
import { requireSuperAdminDashboardAccess } from "@/app/lib/server-page-auth";

export default async function ModuleAccessSettingsLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireSuperAdminDashboardAccess();
  return children;
}
