import { describe, expect, it, vi } from "vitest";
import {
  applyDeviceSiteSettingsToDocument,
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

  it("applies accent tokens on document root", () => {
    const setAttribute = vi.fn();
    const setProperty = vi.fn();
    const toggle = vi.fn();

    vi.stubGlobal("document", {
      documentElement: {
        setAttribute,
        style: { setProperty },
        classList: { toggle },
      },
    });

    vi.stubGlobal("window", {
      matchMedia: vi.fn(() => ({ matches: false })),
    });

    const settings = sanitizeDeviceSiteSettings({
      deviceId: "device-1234",
      themeMode: "light",
      accentPalette: "teal",
    });

    applyDeviceSiteSettingsToDocument(settings);

    expect(setAttribute).toHaveBeenCalledWith("data-accent", "teal");
    expect(setProperty).toHaveBeenCalledWith("--primary", "hsl(172 66% 45%)");
    expect(setProperty).toHaveBeenCalledWith("--accent", "hsl(172 55% 38%)");
    expect(setProperty).toHaveBeenCalledWith("--ring", "hsl(172 66% 45%)");
    expect(toggle).toHaveBeenCalledWith("dark", false);

    vi.unstubAllGlobals();
  });
});
