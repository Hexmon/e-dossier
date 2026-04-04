import type { ReactNode } from "react";
import { requireDashboardSectionAccess } from "@/app/lib/server-page-auth";

export default async function GeneralManagementLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireDashboardSectionAccess("admin");
  return children;
}
