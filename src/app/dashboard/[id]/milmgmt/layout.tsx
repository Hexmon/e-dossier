import type { ReactNode } from "react";
import { requireDashboardOcModuleAccess } from "@/app/lib/server-page-auth";

export default async function MilitaryManagementLayout({
  children,
  params,
}: Readonly<{ children: ReactNode; params: Promise<{ id: string }> }>) {
  const { id } = await params;
  await requireDashboardOcModuleAccess(id, "DOSSIER");
  return children;
}
