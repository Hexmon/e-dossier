import type { ReactNode } from "react";
import { requireDashboardModuleAccess } from "@/app/lib/server-page-auth";

export default async function ReportsLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireDashboardModuleAccess("REPORTS");
  return children;
}
