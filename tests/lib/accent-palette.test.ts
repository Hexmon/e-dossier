import { describe, expect, it } from "vitest";
import {
  ACCENT_PALETTE_KEYS,
  ACCENT_PALETTE_META,
  isAccentPaletteKey,
} from "@/lib/accent-palette";

describe("accent palette metadata", () => {
  it("contains exactly five allowed palette keys", () => {
    expect(ACCENT_PALETTE_KEYS).toEqual(["blue", "teal", "amber", "purple", "red"]);
  });

  it("provides primary/accent/ring token values for every key", () => {
    for (const key of ACCENT_PALETTE_KEYS) {
      const meta = ACCENT_PALETTE_META[key];
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.tokens.primary.length).toBeGreaterThan(0);
      expect(meta.tokens.accent.length).toBeGreaterThan(0);
      expect(meta.tokens.ring.length).toBeGreaterThan(0);
    }
  });

  it("guards allowed keys correctly", () => {
    expect(isAccentPaletteKey("blue")).toBe(true);
    expect(isAccentPaletteKey("teal")).toBe(true);
    expect(isAccentPaletteKey("unknown")).toBe(false);
    expect(isAccentPaletteKey("")).toBe(false);
    expect(isAccentPaletteKey(undefined)).toBe(false);
  });
});

