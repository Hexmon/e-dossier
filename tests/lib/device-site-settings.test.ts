import { describe, expect, it } from "vitest";
import {
  clampRefreshIntervalSec,
  resolveAppliedTheme,
  sanitizeDeviceSiteSettings,
  type DeviceSiteSettings,
} from "@/lib/device-site-settings";

describe("device site settings helpers", () => {
  it("clamps refresh interval to 10..900", () => {
    expect(clampRefreshIntervalSec(1)).toBe(10);
    expect(clampRefreshIntervalSec(60)).toBe(60);
    expect(clampRefreshIntervalSec(1200)).toBe(900);
  });

  it("resolves theme mode with system fallback", () => {
    expect(resolveAppliedTheme("light", true)).toBe("light");
    expect(resolveAppliedTheme("dark", false)).toBe("dark");
    expect(resolveAppliedTheme("system", true)).toBe("dark");
    expect(resolveAppliedTheme("system", false)).toBe("light");
  });

  it("sanitizes invalid settings into strict defaults", () => {
    const settings = sanitizeDeviceSiteSettings({
      deviceId: "device-1234",
      themeMode: "invalid" as DeviceSiteSettings["themeMode"],
      accentPalette: "invalid" as DeviceSiteSettings["accentPalette"],
      density: "invalid" as DeviceSiteSettings["density"],
      refreshIntervalSec: 2,
    });

    expect(settings.themeMode).toBe("system");
    expect(settings.accentPalette).toBe("blue");
    expect(settings.density).toBe("comfortable");
    expect(settings.refreshIntervalSec).toBe(10);
    expect(settings.timezone).toBe("Asia/Kolkata");
  });
});
