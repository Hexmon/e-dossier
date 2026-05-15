import React from "react";

import DashboardHomePageClient from "@/components/Dashboard/DashboardHomePageClient";
import { SystemUnavailablePanel } from "@/components/system/SystemUnavailablePanel";
import { getOptionalDashboardAccess } from "@/app/lib/server-page-auth";
import { getSetupStatus, isSetupStatusUnavailable } from "@/app/lib/setup-status";

export default async function DashboardPage() {
  const setupStatus = await getSetupStatus();

  if (isSetupStatusUnavailable(setupStatus)) {
    return <SystemUnavailablePanel message={setupStatus.availability.message} />;
  }

  const authContext = await getOptionalDashboardAccess();

  const showSetupResumeBanner =
    authContext?.roleGroup === "ADMIN" || authContext?.roleGroup === "SUPER_ADMIN";

  return (
    <DashboardHomePageClient
      showSetupResumeBanner={showSetupResumeBanner}
      setupComplete={setupStatus.setupComplete}
      nextSetupStep={setupStatus.nextStep}
    />
  );
}
