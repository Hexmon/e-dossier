import { z } from "zod";
import { ACCENT_PALETTE_KEYS } from "@/lib/accent-palette";

export const DEVICE_SITE_TIMEZONE = "Asia/Kolkata" as const;

export const deviceThemeModeSchema = z.enum(["light", "dark", "system"]);
export const deviceThemePresetSchema = z.literal("navy-steel");
export const deviceAccentPaletteSchema = z.enum(ACCENT_PALETTE_KEYS);
export const deviceDensitySchema = z.enum(["compact", "comfortable"]);
export const deviceLanguageSchema = z.literal("en");

export const deviceIdSchema = z
  .string()
  .trim()
  .min(8, "deviceId is required")
  .max(128, "deviceId is too long")
  .regex(/^[a-zA-Z0-9._:-]+$/, "deviceId contains invalid characters");

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const adminDeviceSiteSettingsQuerySchema = z.object({
  deviceId: deviceIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const meDeviceSiteSettingsQuerySchema = z.object({
  deviceId: deviceIdSchema.optional(),
});

export const deviceSiteSettingsUpsertSchema = z.object({
  deviceId: deviceIdSchema,
  themeMode: deviceThemeModeSchema.default("system"),
  themePreset: deviceThemePresetSchema.default("navy-steel"),
  accentPalette: deviceAccentPaletteSchema.default("blue"),
  density: deviceDensitySchema.default("comfortable"),
  language: deviceLanguageSchema.default("en"),
  timezone: z.literal(DEVICE_SITE_TIMEZONE).default(DEVICE_SITE_TIMEZONE),
  refreshIntervalSec: z.number().int().min(10).max(900).default(60),
});

export type DeviceSiteSettingsUpsert = z.infer<typeof deviceSiteSettingsUpsertSchema>;
