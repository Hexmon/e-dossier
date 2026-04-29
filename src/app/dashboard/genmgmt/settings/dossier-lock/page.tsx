import DossierLockSettingsPageClient from "@/components/genmgmt/DossierLockSettingsPageClient";
import { getDossierLockSettingsOrDefault } from "@/app/db/queries/dossier-lock-settings";

export const dynamic = "force-dynamic";

export default async function DossierLockSettingsPage() {
  const settings = await getDossierLockSettingsOrDefault();
  const initialSettings = {
    ...settings,
    createdAt: settings.createdAt ? settings.createdAt.toISOString() : null,
    updatedAt: settings.updatedAt ? settings.updatedAt.toISOString() : null,
  };

  return <DossierLockSettingsPageClient initialSettings={initialSettings} />;
}
