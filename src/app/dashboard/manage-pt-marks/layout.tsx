import type { ReactNode } from "react";
import { requireDashboardBulkWorkflowAccess } from "@/app/lib/server-page-auth";

export default async function ManagePtMarksLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireDashboardBulkWorkflowAccess("PT_BULK");
  return children;
}
