import type { ReactNode } from "react";
import { requireDashboardSectionAccess } from "@/app/lib/server-page-auth";

export default async function BulkUploadLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireDashboardSectionAccess("bulk_upload");
  return children;
}
