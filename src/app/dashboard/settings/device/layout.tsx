import { requireAdminDashboardAccess } from "@/app/lib/server-page-auth";
import type { ReactNode } from "react";

export default async function DeviceSettingsLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireAdminDashboardAccess();
  return <>{children}</>;
}
