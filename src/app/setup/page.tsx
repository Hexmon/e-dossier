import React from "react";
import { redirect } from "next/navigation";

import { SetupPageClient } from "@/components/setup/SetupPageClient";
import { SystemUnavailablePanel } from "@/components/system/SystemUnavailablePanel";
import { getOptionalDashboardAccess } from "@/app/lib/server-page-auth";
import { getSetupStatus, isSetupStatusUnavailable } from "@/app/lib/setup-status";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const setupStatus = await getSetupStatus();

  if (isSetupStatusUnavailable(setupStatus)) {
    return <SystemUnavailablePanel message={setupStatus.availability.message} />;
  }

  const authContext = await getOptionalDashboardAccess();

  if (authContext?.roleGroup === "OTHER_USERS" && setupStatus.setupComplete) {
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
