import DashboardHomePageClient from "@/components/Dashboard/DashboardHomePageClient";
import { getOptionalDashboardAccess } from "@/app/lib/server-page-auth";
import { getSetupStatus } from "@/app/lib/setup-status";

export default async function DashboardPage() {
  const [setupStatus, authContext] = await Promise.all([
    getSetupStatus(),
    getOptionalDashboardAccess(),
  ]);

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
