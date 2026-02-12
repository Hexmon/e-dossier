import { getOrCreateDeviceIdClient, setDeviceIdCookie } from "@/lib/device-context";

export type ThemeMode = "light" | "dark" | "system";
export type ThemePreset = "navy-steel";
export type AccentPalette = "blue" | "teal" | "amber" | "purple" | "red";
export type DensityMode = "compact" | "comfortable";
export type LanguageCode = "en";

export type DeviceSiteSettings = {
  deviceId: string;
  themeMode: ThemeMode;
  themePreset: ThemePreset;
  accentPalette: AccentPalette;
  density: DensityMode;
  language: LanguageCode;
  timezone: "Asia/Kolkata";
  refreshIntervalSec: number;
  updatedAt: string | null;
  updatedBy: string | null;
};

export const DEVICE_SITE_SETTINGS_STORAGE_KEY = "e_dossier_device_site_settings";
export const DEVICE_SITE_SETTINGS_EVENT = "device-site-settings:changed";

export const DEFAULT_DEVICE_SITE_SETTINGS: DeviceSiteSettings = {
  deviceId: "",
  themeMode: "system",
  themePreset: "navy-steel",
  accentPalette: "blue",
  density: "comfortable",
  language: "en",
  timezone: "Asia/Kolkata",
  refreshIntervalSec: 60,
  updatedAt: null,
  updatedBy: null,
};

const ACCENT_VALUES = new Set<AccentPalette>(["blue", "teal", "amber", "purple", "red"]);
const THEME_VALUES = new Set<ThemeMode>(["light", "dark", "system"]);
const DENSITY_VALUES = new Set<DensityMode>(["compact", "comfortable"]);

export function clampRefreshIntervalSec(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_DEVICE_SITE_SETTINGS.refreshIntervalSec;
  }
  const rounded = Math.round(parsed);
  if (rounded < 10) return 10;
  if (rounded > 900) return 900;
  return rounded;
}

export function sanitizeDeviceSiteSettings(
  input: Partial<DeviceSiteSettings> & { deviceId?: string | null }
): DeviceSiteSettings {
  const themeMode = THEME_VALUES.has(input.themeMode as ThemeMode)
    ? (input.themeMode as ThemeMode)
    : DEFAULT_DEVICE_SITE_SETTINGS.themeMode;

  const accentPalette = ACCENT_VALUES.has(input.accentPalette as AccentPalette)
    ? (input.accentPalette as AccentPalette)
    : DEFAULT_DEVICE_SITE_SETTINGS.accentPalette;

  const density = DENSITY_VALUES.has(input.density as DensityMode)
    ? (input.density as DensityMode)
    : DEFAULT_DEVICE_SITE_SETTINGS.density;

  return {
    deviceId: String(input.deviceId ?? ""),
    themeMode,
    themePreset: "navy-steel",
    accentPalette,
    density,
    language: "en",
    timezone: "Asia/Kolkata",
    refreshIntervalSec: clampRefreshIntervalSec(input.refreshIntervalSec),
    updatedAt: input.updatedAt ?? null,
    updatedBy: input.updatedBy ?? null,
  };
}

export function resolveAppliedTheme(themeMode: ThemeMode, prefersDark: boolean): "light" | "dark" {
  if (themeMode === "light") return "light";
  if (themeMode === "dark") return "dark";
  return prefersDark ? "dark" : "light";
}

export function applyDeviceSiteSettingsToDocument(settings: DeviceSiteSettings): void {
  if (typeof document === "undefined") return;

  const html = document.documentElement;
  const prefersDark =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const appliedTheme = resolveAppliedTheme(settings.themeMode, prefersDark);

  html.setAttribute("data-theme-mode", settings.themeMode);
  html.setAttribute("data-theme", appliedTheme);
  html.setAttribute("data-density", settings.density);
  html.setAttribute("data-accent", settings.accentPalette);
  html.setAttribute("data-theme-preset", settings.themePreset);
  html.classList.toggle("dark", appliedTheme === "dark");
}

export function readStoredDeviceSiteSettings(): DeviceSiteSettings | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(DEVICE_SITE_SETTINGS_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<DeviceSiteSettings>;
    return sanitizeDeviceSiteSettings(parsed);
  } catch {
    return null;
  }
}

export function commitDeviceSiteSettings(settings: Partial<DeviceSiteSettings>): DeviceSiteSettings {
  const next = sanitizeDeviceSiteSettings(settings);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DEVICE_SITE_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    applyDeviceSiteSettingsToDocument(next);
    window.dispatchEvent(new CustomEvent(DEVICE_SITE_SETTINGS_EVENT, { detail: next }));
  }
  return next;
}

export function ensureClientDeviceContext(): string {
  const deviceId = getOrCreateDeviceIdClient();
  setDeviceIdCookie(deviceId);
  return deviceId;
}
