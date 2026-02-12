import { desc, eq } from "drizzle-orm";
import { db } from "@/app/db/client";
import { deviceSiteSettings } from "@/app/db/schema/auth/deviceSiteSettings";

export type ThemeMode = "light" | "dark" | "system";
export type ThemePreset = "navy-steel";
export type AccentPalette = "blue" | "teal" | "amber" | "purple" | "red";
export type DensityMode = "compact" | "comfortable";
export type LanguageCode = "en";

export type DeviceSiteSettingsRecord = {
  id: string | null;
  deviceId: string;
  themeMode: ThemeMode;
  themePreset: ThemePreset;
  accentPalette: AccentPalette;
  density: DensityMode;
  language: LanguageCode;
  timezone: "Asia/Kolkata";
  refreshIntervalSec: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  updatedBy: string | null;
};

export type UpsertDeviceSiteSettingsInput = {
  deviceId: string;
  themeMode: ThemeMode;
  themePreset: ThemePreset;
  accentPalette: AccentPalette;
  density: DensityMode;
  language: LanguageCode;
  timezone: "Asia/Kolkata";
  refreshIntervalSec: number;
};

export const DEFAULT_DEVICE_SITE_SETTINGS: Omit<
  DeviceSiteSettingsRecord,
  "id" | "deviceId" | "createdAt" | "updatedAt" | "updatedBy"
> = {
  themeMode: "system",
  themePreset: "navy-steel",
  accentPalette: "blue",
  density: "comfortable",
  language: "en",
  timezone: "Asia/Kolkata",
  refreshIntervalSec: 60,
};

const SELECT_FIELDS = {
  id: deviceSiteSettings.id,
  deviceId: deviceSiteSettings.deviceId,
  themeMode: deviceSiteSettings.themeMode,
  themePreset: deviceSiteSettings.themePreset,
  accentPalette: deviceSiteSettings.accentPalette,
  density: deviceSiteSettings.density,
  language: deviceSiteSettings.language,
  timezone: deviceSiteSettings.timezone,
  refreshIntervalSec: deviceSiteSettings.refreshIntervalSec,
  createdAt: deviceSiteSettings.createdAt,
  updatedAt: deviceSiteSettings.updatedAt,
  updatedBy: deviceSiteSettings.updatedBy,
} as const;

export function buildDefaultDeviceSiteSettings(deviceId: string): DeviceSiteSettingsRecord {
  return {
    id: null,
    deviceId,
    ...DEFAULT_DEVICE_SITE_SETTINGS,
    createdAt: null,
    updatedAt: null,
    updatedBy: null,
  };
}

export async function getDeviceSiteSettingsByDeviceId(deviceId: string) {
  const [row] = await db
    .select(SELECT_FIELDS)
    .from(deviceSiteSettings)
    .where(eq(deviceSiteSettings.deviceId, deviceId))
    .limit(1);

  return (row ?? null) as DeviceSiteSettingsRecord | null;
}

export async function listDeviceSiteSettings({
  limit,
  offset,
}: {
  limit: number;
  offset: number;
}) {
  const rows = await db
    .select(SELECT_FIELDS)
    .from(deviceSiteSettings)
    .orderBy(desc(deviceSiteSettings.updatedAt), desc(deviceSiteSettings.createdAt))
    .limit(limit)
    .offset(offset);

  return rows as DeviceSiteSettingsRecord[];
}

export async function getEffectiveDeviceSiteSettings(deviceId: string) {
  const existing = await getDeviceSiteSettingsByDeviceId(deviceId);
  return existing ?? buildDefaultDeviceSiteSettings(deviceId);
}

export async function upsertDeviceSiteSettings(
  input: UpsertDeviceSiteSettingsInput,
  actorUserId: string
) {
  const now = new Date();

  const [row] = await db
    .insert(deviceSiteSettings)
    .values({
      deviceId: input.deviceId,
      themeMode: input.themeMode,
      themePreset: input.themePreset,
      accentPalette: input.accentPalette,
      density: input.density,
      language: input.language,
      timezone: input.timezone,
      refreshIntervalSec: input.refreshIntervalSec,
      updatedBy: actorUserId,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [deviceSiteSettings.deviceId],
      set: {
        themeMode: input.themeMode,
        themePreset: input.themePreset,
        accentPalette: input.accentPalette,
        density: input.density,
        language: input.language,
        timezone: input.timezone,
        refreshIntervalSec: input.refreshIntervalSec,
        updatedBy: actorUserId,
        updatedAt: now,
      },
    })
    .returning(SELECT_FIELDS);

  return row as DeviceSiteSettingsRecord;
}

// Backward-compatible helpers used by the previous v1 settings route/tests.
export const getDeviceSiteSettings = getDeviceSiteSettingsByDeviceId;
