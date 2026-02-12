import { afterEach, describe, expect, it, vi } from "vitest";

import {
  addThemeChangedListener,
  getChartThemePalette,
  withAlpha,
} from "@/components/performance_graph/chartTheme";
import { DEVICE_SITE_SETTINGS_EVENT } from "@/lib/device-site-settings";

describe("chartTheme", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("falls back when document is unavailable", () => {
    expect(getChartThemePalette().primary).toBe("oklch(0.62 0.16 250)");
    expect(withAlpha("oklch(0.62 0.16 250)", 0.4)).toBe("oklch(0.62 0.16 250)");
  });

  it("reads colors from css variables when document is available", () => {
    const cssVars: Record<string, string> = {
      "--primary": "217 91% 60%",
      "--info": "198 90% 48%",
      "--success": "142 70% 45%",
      "--warning": "38 92% 50%",
      "--destructive": "0 72% 51%",
      "--foreground": "210 20% 90%",
      "--muted-foreground": "215 15% 55%",
      "--border": "220 15% 20%",
      "--card": "220 18% 14%",
    };

    const root = {} as HTMLElement;
    const probe = { style: {} } as HTMLElement;
    const appendChild = vi.fn();
    const removeChild = vi.fn();

    vi.stubGlobal("document", {
      documentElement: root,
      body: { appendChild, removeChild },
      createElement: vi.fn(() => probe),
    });

    vi.stubGlobal(
      "getComputedStyle",
      vi.fn((target: unknown) => {
        if (target === root) {
          return {
            getPropertyValue: (name: string) => cssVars[name] ?? "",
          } as CSSStyleDeclaration;
        }

        return { color: "rgb(10, 20, 30)" } as CSSStyleDeclaration;
      })
    );

    const palette = getChartThemePalette();

    expect(palette.primary).toBe("217 91% 60%");
    expect(palette.border).toBe("220 15% 20%");
    expect(withAlpha("var(--primary)", 0.5)).toBe("rgba(10, 20, 30, 0.5)");
  });

  it("binds and cleans up the device-settings theme event", () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const handler = vi.fn();

    vi.stubGlobal("window", {
      addEventListener,
      removeEventListener,
    });

    const cleanup = addThemeChangedListener(handler);
    expect(addEventListener).toHaveBeenCalledWith(DEVICE_SITE_SETTINGS_EVENT, handler);

    cleanup();
    expect(removeEventListener).toHaveBeenCalledWith(DEVICE_SITE_SETTINGS_EVENT, handler);
  });
});
