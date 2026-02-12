import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_DEVICE_SITE_SETTINGS,
  DEVICE_SITE_SETTINGS_EVENT,
  clampRefreshIntervalSec,
  readStoredDeviceSiteSettings,
  type DeviceSiteSettings,
} from "@/lib/device-site-settings";

function getInitialRefreshIntervalSec(): number {
  if (typeof window === "undefined") {
    return DEFAULT_DEVICE_SITE_SETTINGS.refreshIntervalSec;
  }

  return clampRefreshIntervalSec(
    readStoredDeviceSiteSettings()?.refreshIntervalSec ?? DEFAULT_DEVICE_SITE_SETTINGS.refreshIntervalSec
  );
}

export function useDeviceRefreshInterval() {
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(getInitialRefreshIntervalSec);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromStorage = () => {
      setRefreshIntervalSec(
        clampRefreshIntervalSec(
          readStoredDeviceSiteSettings()?.refreshIntervalSec ??
            DEFAULT_DEVICE_SITE_SETTINGS.refreshIntervalSec
        )
      );
    };

    const handleSettingsChanged = (event: Event) => {
      const customEvent = event as CustomEvent<DeviceSiteSettings>;
      setRefreshIntervalSec(clampRefreshIntervalSec(customEvent.detail?.refreshIntervalSec));
    };

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(DEVICE_SITE_SETTINGS_EVENT, handleSettingsChanged as EventListener);

    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(DEVICE_SITE_SETTINGS_EVENT, handleSettingsChanged as EventListener);
    };
  }, []);

  return useMemo(
    () => ({
      refreshIntervalSec,
      refreshIntervalMs: refreshIntervalSec * 1000,
    }),
    [refreshIntervalSec]
  );
}
