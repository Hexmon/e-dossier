import type { ReactNode } from "react";
import { requireDashboardModuleAccess } from "@/app/lib/server-page-auth";

export default async function MilitaryManagementLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireDashboardModuleAccess("DOSSIER");
  return children;
}
