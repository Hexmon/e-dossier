import { describe, expect, it } from "vitest";

import {
  resolveStatusToneClasses,
  resolveTabStateClasses,
  resolveToneClasses,
  type ColorTone,
  type ToneSurface,
} from "@/lib/theme-color";

const tones: ColorTone[] = ["primary", "secondary", "muted", "success", "warning", "info", "destructive"];
const surfaces: ToneSurface[] = ["icon", "badge", "text", "subtle", "button"];

describe("theme-color", () => {
  it("resolves all tone/surface combinations", () => {
    for (const tone of tones) {
      for (const surface of surfaces) {
        const value = resolveToneClasses(tone, surface);
        expect(value).toBeTypeOf("string");
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });

  it("maps status values to semantic tones", () => {
    expect(resolveStatusToneClasses("completed")).toContain("success");
    expect(resolveStatusToneClasses("pending")).toContain("warning");
    expect(resolveStatusToneClasses("failed")).toContain("destructive");
    expect(resolveStatusToneClasses("unknown")).toContain("muted");
  });

  it("returns active/inactive tab classes", () => {
    expect(resolveTabStateClasses(true)).toContain("bg-primary");
    expect(resolveTabStateClasses(false)).toContain("bg-muted");
  });
});
