import { eq } from "drizzle-orm";
import { db } from "@/app/db/client";
import { moduleAccessSettings } from "@/app/db/schema/auth/moduleAccessSettings";
import type { ModuleAccessSettingsInput } from "@/app/lib/validators.module-access";

const DEFAULT_SINGLETON_KEY = "default" as const;

const MODULE_ACCESS_SETTINGS_SELECT = {
  id: moduleAccessSettings.id,
  singletonKey: moduleAccessSettings.singletonKey,
  adminCanAccessDossier: moduleAccessSettings.adminCanAccessDossier,
  adminCanAccessBulkUpload: moduleAccessSettings.adminCanAccessBulkUpload,
  adminCanAccessReports: moduleAccessSettings.adminCanAccessReports,
  updatedBy: moduleAccessSettings.updatedBy,
  createdAt: moduleAccessSettings.createdAt,
  updatedAt: moduleAccessSettings.updatedAt,
} as const;

export type ModuleAccessSettingsRecord = typeof moduleAccessSettings.$inferSelect;

export const DEFAULT_MODULE_ACCESS_SETTINGS = {
  adminCanAccessDossier: false,
  adminCanAccessBulkUpload: false,
  adminCanAccessReports: false,
} as const;

function now() {
  return new Date();
}

function buildDefaultSettingsRecord() {
  return {
    id: "",
    singletonKey: DEFAULT_SINGLETON_KEY,
    adminCanAccessDossier: DEFAULT_MODULE_ACCESS_SETTINGS.adminCanAccessDossier,
    adminCanAccessBulkUpload: DEFAULT_MODULE_ACCESS_SETTINGS.adminCanAccessBulkUpload,
    adminCanAccessReports: DEFAULT_MODULE_ACCESS_SETTINGS.adminCanAccessReports,
    updatedBy: null,
    createdAt: null,
    updatedAt: null,
  };
}

export async function getModuleAccessSettingsOrDefault() {
  const [existing] = await db
    .select(MODULE_ACCESS_SETTINGS_SELECT)
    .from(moduleAccessSettings)
    .where(eq(moduleAccessSettings.singletonKey, DEFAULT_SINGLETON_KEY))
    .limit(1);

  return existing ?? buildDefaultSettingsRecord();
}

export async function getOrCreateModuleAccessSettings() {
  const existing = await getModuleAccessSettingsOrDefault();
  if (existing.id) {
    return existing;
  }

  const [created] = await db
    .insert(moduleAccessSettings)
    .values({ singletonKey: DEFAULT_SINGLETON_KEY })
    .returning(MODULE_ACCESS_SETTINGS_SELECT);

  return created;
}

export async function updateModuleAccessSettings(
  input: ModuleAccessSettingsInput,
  actorUserId: string
) {
  const current = await getOrCreateModuleAccessSettings();

  const [updated] = await db
    .update(moduleAccessSettings)
    .set({
      adminCanAccessDossier: input.adminCanAccessDossier,
      adminCanAccessBulkUpload: input.adminCanAccessBulkUpload,
      adminCanAccessReports: input.adminCanAccessReports,
      updatedBy: actorUserId,
      updatedAt: now(),
    })
    .where(eq(moduleAccessSettings.id, current.id))
    .returning(MODULE_ACCESS_SETTINGS_SELECT);

  return {
    before: current,
    after: updated,
  };
}
