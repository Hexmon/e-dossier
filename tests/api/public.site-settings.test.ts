import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getPublicSettings } from "@/app/api/v1/site-settings/route";
import { GET as getPublicCommanders } from "@/app/api/v1/site-settings/commanders/route";
import { GET as getPublicAwards } from "@/app/api/v1/site-settings/awards/route";
import { GET as getPublicHistory } from "@/app/api/v1/site-settings/history/route";
import { makeJsonRequest, createRouteContext } from "../utils/next";

import * as siteQueries from "@/app/db/queries/site-settings";

vi.mock("@/app/db/queries/site-settings", () => ({
  getSiteSettingsOrDefault: vi.fn(async () => ({
    logoUrl: null,
    heroTitle: "MCEME",
    heroDescription: "desc",
    commandersSectionTitle: "Commander's Corner",
    awardsSectionTitle: "Gallantry Awards",
    historySectionTitle: "Our History",
  })),
  listPublicCommanders: vi.fn(async () => [
    {
      id: "1",
      name: "Commander",
      imageUrl: null,
      tenure: "2025",
      description: "desc",
      sortOrder: 1,
    },
  ]),
  listPublicAwards: vi.fn(async () => [
    {
      id: "1",
      title: "Award",
      description: "desc",
      category: "Cat",
      imageUrl: null,
      sortOrder: 1,
    },
  ]),
  listPublicHistory: vi.fn(async () => [
    {
      id: "1",
      yearOrDate: "1943",
      description: "desc",
    },
  ]),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Public site settings routes", () => {
  it("returns base public settings", async () => {
    const req = makeJsonRequest({ method: "GET", path: "/api/v1/site-settings" });
    const res = await getPublicSettings(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.settings.heroTitle).toBe("MCEME");
    expect(res.headers.get("Cache-Control")).toContain("max-age=60");
  });

  it("returns public commanders", async () => {
    const req = makeJsonRequest({ method: "GET", path: "/api/v1/site-settings/commanders" });
    const res = await getPublicCommanders(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(siteQueries.listPublicCommanders).toHaveBeenCalledTimes(1);
  });

  it("returns public awards", async () => {
    const req = makeJsonRequest({ method: "GET", path: "/api/v1/site-settings/awards" });
    const res = await getPublicAwards(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(1);
  });

  it("returns public history for selected sort", async () => {
    const req = makeJsonRequest({ method: "GET", path: "/api/v1/site-settings/history?sort=desc" });
    const res = await getPublicHistory(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sort).toBe("desc");
    expect(siteQueries.listPublicHistory).toHaveBeenCalledWith("desc");
  });
});
