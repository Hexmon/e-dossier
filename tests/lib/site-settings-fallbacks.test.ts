import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSiteSettingsOrDefault: vi.fn(),
  listPublicCommandersForDisplay: vi.fn(),
  listPublicAwards: vi.fn(),
  listPublicHistory: vi.fn(),
  listPublicEventsNews: vi.fn(),
  getPublicFooter: vi.fn(),
  listPublicPlatoonsForLanding: vi.fn(),
}));

vi.mock("@/app/db/queries/site-settings", () => ({
  getSiteSettingsOrDefault: mocks.getSiteSettingsOrDefault,
  listPublicCommandersForDisplay: mocks.listPublicCommandersForDisplay,
  listPublicAwards: mocks.listPublicAwards,
  listPublicHistory: mocks.listPublicHistory,
  listPublicEventsNews: mocks.listPublicEventsNews,
  getPublicFooter: mocks.getPublicFooter,
}));

vi.mock("@/app/db/queries/public-platoons", () => ({
  listPublicPlatoonsForLanding: mocks.listPublicPlatoonsForLanding,
}));

import {
  FALLBACK_PUBLIC_FOOTER,
  FALLBACK_PUBLIC_SITE_SETTINGS,
  fetchLandingSiteSettings,
  normalizePublicSiteSettings,
} from "@/app/lib/public-site-settings";

beforeEach(() => {
  mocks.getSiteSettingsOrDefault.mockResolvedValue({
    logoUrl: "https://cdn.local/logo.png",
    heroBgUrl: "https://cdn.local/hero.jpg",
    heroTitle: "Saved Home Title",
    heroDescription: "Saved home description",
    commandersSectionTitle: "Saved Commanders",
    awardsSectionTitle: "Saved Awards",
    historySectionTitle: "Saved History",
  });
  mocks.listPublicCommandersForDisplay.mockResolvedValue([
    {
      id: "commander-1",
      name: "Commander One",
      designation: "Commandant",
      imageUrl: null,
      displayImageUrl: null,
      tenure: "2024-2026",
      description: "Message",
      sortOrder: 1,
    },
  ]);
  mocks.listPublicAwards.mockResolvedValue([
    {
      id: "award-1",
      title: "Award",
      description: "Award details",
      category: "Gallantry",
      imageUrl: null,
      sortOrder: 1,
    },
  ]);
  mocks.listPublicHistory.mockResolvedValue([
    {
      id: "history-1",
      incidentDate: "2026-01-01",
      description: "History details",
    },
  ]);
  mocks.listPublicEventsNews.mockResolvedValue([
    {
      id: "event-1",
      date: "2026-01-02",
      title: "Event",
      description: "Event details",
      location: "Campus",
      type: "event",
    },
  ]);
  mocks.getPublicFooter.mockResolvedValue({ footer: " Saved footer " });
  mocks.listPublicPlatoonsForLanding.mockResolvedValue([
    {
      id: "platoon-1",
      key: "A",
      name: "Alpha",
      about: "About Alpha",
      themeColor: "#123456",
      imageUrl: null,
      imageObjectKey: null,
    },
  ]);
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

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

  it("defines a non-empty fallback footer", () => {
    expect(FALLBACK_PUBLIC_FOOTER.length).toBeGreaterThan(10);
  });
});

describe("fetchLandingSiteSettings", () => {
  it("loads saved landing data from database queries instead of self-fetching API URLs", async () => {
    const result = await fetchLandingSiteSettings();

    expect(fetch).not.toHaveBeenCalled();
    expect(result.settings.heroTitle).toBe("Saved Home Title");
    expect(result.commanders[0]).toMatchObject({
      name: "Commander One",
      designation: "Commandant",
    });
    expect(result.footer).toBe("Saved footer");
    expect(result.platoons[0]).toMatchObject({
      key: "A",
      themeColor: "#123456",
    });
    expect(mocks.listPublicHistory).toHaveBeenCalledWith("asc");
    expect(mocks.listPublicEventsNews).toHaveBeenCalledWith("desc");
  });
});
