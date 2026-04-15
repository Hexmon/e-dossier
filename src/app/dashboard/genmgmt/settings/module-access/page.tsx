import ModuleAccessSettingsPageClient from "@/components/genmgmt/ModuleAccessSettingsPageClient";
import { getModuleAccessSettingsOrDefault } from "@/app/db/queries/module-access-settings";

export const dynamic = "force-dynamic";

export default async function ModuleAccessSettingsPage() {
  const settings = await getModuleAccessSettingsOrDefault();
  const initialSettings = {
    ...settings,
    createdAt: settings.createdAt ? settings.createdAt.toISOString() : null,
    updatedAt: settings.updatedAt ? settings.updatedAt.toISOString() : null,
  };

  return <ModuleAccessSettingsPageClient initialSettings={initialSettings} />;
}
