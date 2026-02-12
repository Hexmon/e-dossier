import { api } from "@/app/lib/apiClient";
import { baseURL } from "@/constants/endpoints";
import type { DeviceSiteSettings } from "@/lib/device-site-settings";

export type UpsertDeviceSiteSettingsInput = {
  deviceId: string;
  themeMode: "light" | "dark" | "system";
  themePreset: "navy-steel";
  accentPalette: "blue" | "teal" | "amber" | "purple" | "red";
  density: "compact" | "comfortable";
  language: "en";
  timezone: "Asia/Kolkata";
  refreshIntervalSec: number;
};

type GetAdminResponse = { message: string; settings: DeviceSiteSettings };
type ListAdminResponse = { message: string; items: DeviceSiteSettings[]; pagination: { limit: number; offset: number } };
type MeResponse = {
  message: string;
  settings: DeviceSiteSettings;
  deviceId: string | null;
};

export const deviceSiteSettingsApi = {
  getForDevice: async (deviceId: string) => {
    return api.get<GetAdminResponse>("/api/v1/admin/device-site-settings", {
      baseURL,
      query: { deviceId },
    });
  },

  list: async (limit = 20, offset = 0) => {
    return api.get<ListAdminResponse>("/api/v1/admin/device-site-settings", {
      baseURL,
      query: { limit, offset },
    });
  },

  upsertForDevice: async (input: UpsertDeviceSiteSettingsInput) => {
    return api.put<GetAdminResponse, UpsertDeviceSiteSettingsInput>(
      "/api/v1/admin/device-site-settings",
      input,
      { baseURL }
    );
  },

  getMeEffective: async (deviceId?: string) => {
    return api.get<MeResponse>("/api/v1/me/device-site-settings", {
      baseURL,
      query: deviceId ? { deviceId } : undefined,
      headers: deviceId ? { "x-device-id": deviceId } : undefined,
      skipAuth: true,
    });
  },

  // Backward-compatible API wrappers for existing hook/component call sites.
  get: async (deviceId: string) => deviceSiteSettingsApi.getForDevice(deviceId),
  upsert: async (input: UpsertDeviceSiteSettingsInput) => deviceSiteSettingsApi.upsertForDevice(input),
};
