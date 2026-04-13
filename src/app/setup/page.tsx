import React from "react";
import { redirect } from "next/navigation";

import { SetupPageClient } from "@/components/setup/SetupPageClient";
import { getOptionalDashboardAccess } from "@/app/lib/server-page-auth";
import { getSetupStatus } from "@/app/lib/setup-status";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const [setupStatus, authContext] = await Promise.all([
    getSetupStatus(),
    getOptionalDashboardAccess(),
  ]);

  if (authContext?.roleGroup === "OTHER_USERS") {
    redirect("/dashboard");
  }

  if (
    authContext &&
    (authContext.roleGroup === "ADMIN" || authContext.roleGroup === "SUPER_ADMIN") &&
    setupStatus.setupComplete
  ) {
    redirect("/dashboard/genmgmt");
  }

  return <SetupPageClient initialStatus={setupStatus} roleGroup={authContext?.roleGroup ?? null} />;
}
