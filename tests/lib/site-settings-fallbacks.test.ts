import { describe, expect, it } from "vitest";

import {
  FALLBACK_PUBLIC_SITE_SETTINGS,
  normalizePublicSiteSettings,
} from "@/app/lib/public-site-settings";

describe("normalizePublicSiteSettings", () => {
  it("uses fallback values when payload is null", () => {
    const result = normalizePublicSiteSettings(null);

    expect(result).toEqual(FALLBACK_PUBLIC_SITE_SETTINGS);
  });

  it("prefers payload values when provided", () => {
    const result = normalizePublicSiteSettings({
      logoUrl: "https://x/logo.png",
      heroTitle: "New Hero",
      heroDescription: "New Description",
      commandersSectionTitle: "Commanders",
      awardsSectionTitle: "Awards",
      historySectionTitle: "History",
    });

    expect(result.heroTitle).toBe("New Hero");
    expect(result.logoUrl).toBe("https://x/logo.png");
  });

  it("falls back per-field for missing values", () => {
    const result = normalizePublicSiteSettings({
      heroTitle: "Only Hero",
    });

    expect(result.heroTitle).toBe("Only Hero");
    expect(result.historySectionTitle).toBe(FALLBACK_PUBLIC_SITE_SETTINGS.historySectionTitle);
  });
});
