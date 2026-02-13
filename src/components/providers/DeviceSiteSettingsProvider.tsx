"use client";

import { PropsWithChildren, useEffect } from "react";
import { deviceSiteSettingsApi } from "@/app/lib/api/deviceSiteSettingsApi";
import {
  DEFAULT_DEVICE_SITE_SETTINGS,
  commitDeviceSiteSettings,
  ensureClientDeviceContext,
  readStoredDeviceSiteSettings,
  sanitizeDeviceSiteSettings,
} from "@/lib/device-site-settings";

export default function DeviceSiteSettingsProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    const currentDeviceId = ensureClientDeviceContext();

    const stored = readStoredDeviceSiteSettings();
    const initial = sanitizeDeviceSiteSettings({
      ...(stored ?? DEFAULT_DEVICE_SITE_SETTINGS),
      deviceId: stored?.deviceId || currentDeviceId,
    });
    commitDeviceSiteSettings(initial);

    let cancelled = false;

    const syncFromServer = async () => {
      try {
        const response = await deviceSiteSettingsApi.getMeEffective(currentDeviceId);
        if (cancelled || !response?.settings) {
          return;
        }

        const effective = sanitizeDeviceSiteSettings({
          ...response.settings,
          deviceId: response.settings.deviceId || currentDeviceId,
        });
        const stored = readStoredDeviceSiteSettings();
        const merged =
          stored?.themeMode && stored.themeMode !== "system"
            ? { ...effective, themeMode: stored.themeMode }
            : effective;
        commitDeviceSiteSettings(merged);
      } catch {
        // Local snapshot already applied; tolerate network/auth transient failures.
      }
    };

    syncFromServer();

    const media =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;

    const handleSystemThemeChange = () => {
      const latest = readStoredDeviceSiteSettings();
      if (latest?.themeMode === "system") {
        commitDeviceSiteSettings(latest);
      }
    };

    media?.addEventListener?.("change", handleSystemThemeChange);

    return () => {
      cancelled = true;
      media?.removeEventListener?.("change", handleSystemThemeChange);
    };
  }, []);

  return <>{children}</>;
}
