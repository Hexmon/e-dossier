import type { ReactNode } from "react";
import { requireDashboardBulkWorkflowAccess } from "@/app/lib/server-page-auth";

export default async function ManageMarksLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireDashboardBulkWorkflowAccess("ACADEMICS_BULK");
  return children;
}
