import GeneralManagementPageClient from "@/components/genmgmt/GeneralManagementPageClient";
import { getOptionalDashboardAccess } from "@/app/lib/server-page-auth";
import { getSetupStatus } from "@/app/lib/setup-status";

export default async function GeneralManagementPage() {
  const [setupStatus, authContext] = await Promise.all([
    getSetupStatus(),
    getOptionalDashboardAccess(),
  ]);

  return (
    <GeneralManagementPageClient
      isSuperAdmin={authContext?.roleGroup === "SUPER_ADMIN"}
      showSetupResumeBanner={
        authContext?.roleGroup === "ADMIN" || authContext?.roleGroup === "SUPER_ADMIN"
      }
      setupComplete={setupStatus.setupComplete}
      nextSetupStep={setupStatus.nextStep}
    />
  );
}
