import type { ReactNode } from "react";
import DeviceSiteSettingsProvider from "@/components/providers/DeviceSiteSettingsProvider";
import DashboardSessionGuard from "@/components/auth/DashboardSessionGuard";
import { requireDashboardAccess } from "@/app/lib/server-page-auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireDashboardAccess();

  return (
    <DeviceSiteSettingsProvider>
      <DashboardSessionGuard>{children}</DashboardSessionGuard>
    </DeviceSiteSettingsProvider>
  );
}
