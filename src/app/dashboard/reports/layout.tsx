import type { ReactNode } from "react";
import { requireDashboardSectionAccess } from "@/app/lib/server-page-auth";

export default async function ReportsLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireDashboardSectionAccess("reports");
  return children;
}
