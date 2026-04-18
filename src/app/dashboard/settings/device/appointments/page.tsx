import { requirePlatoonCommanderDashboardAccess } from "@/app/lib/server-page-auth";

import CadetAppointmentsSettingsPageClient from "./CadetAppointmentsSettingsPageClient";

export default async function CadetAppointmentsSettingsPage() {
  await requirePlatoonCommanderDashboardAccess();
  return <CadetAppointmentsSettingsPageClient />;
}
