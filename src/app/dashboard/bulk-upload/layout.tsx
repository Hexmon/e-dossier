import type { ReactNode } from "react";
import { requireDashboardBulkHubAccess } from "@/app/lib/server-page-auth";

export default async function BulkUploadLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireDashboardBulkHubAccess();
  return children;
}
