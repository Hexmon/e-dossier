import { requireDashboardAccess } from "@/app/lib/server-page-auth";
import type { ReactNode } from "react";

export default async function PromotionRelegationLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireDashboardAccess();
  return <>{children}</>;
}
