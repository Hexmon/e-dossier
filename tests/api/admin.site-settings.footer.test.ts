import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  GET as getFooter,
  PATCH as patchFooter,
  POST as postFooter,
} from "@/app/api/v1/admin/site-settings/footer/route";
import { makeJsonRequest, createRouteContext } from "../utils/next";

import * as authz from "@/app/lib/authz";
import * as siteQueries from "@/app/db/queries/site-settings";

vi.mock("@/app/lib/authz", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/app/db/queries/site-settings", () => ({
  getSiteFooter: vi.fn(async () => ({
    footer: "Footer text",
  })),
  createSiteFooter: vi.fn(async () => ({
    footer: "Footer text",
  })),
  updateSiteFooter: vi.fn(async () => ({
    before: { footer: "Footer text" },
    after: { footer: "Footer text updated" },
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authz.requireAdmin).mockResolvedValue({
    userId: "admin-1",
    roles: ["ADMIN"],
    claims: {},
  } as Awaited<ReturnType<typeof authz.requireAdmin>>);
});

describe("Admin site settings footer route", () => {
  it("gets footer", async () => {
    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/admin/site-settings/footer",
    });
    const res = await getFooter(req as any, createRouteContext());

    expect(res.status).toBe(200);
    expect(siteQueries.getSiteFooter).toHaveBeenCalledTimes(1);
  });

  it("creates footer", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: "/api/v1/admin/site-settings/footer",
      body: { footer: "Footer text" },
    });
    const res = await postFooter(req as any, createRouteContext());

    expect(res.status).toBe(201);
    expect(siteQueries.createSiteFooter).toHaveBeenCalledWith({ footer: "Footer text" });
  });

  it("updates footer", async () => {
    const req = makeJsonRequest({
      method: "PATCH",
      path: "/api/v1/admin/site-settings/footer",
      body: { footer: "Footer text updated" },
    });
    const res = await patchFooter(req as any, createRouteContext());

    expect(res.status).toBe(200);
    expect(siteQueries.updateSiteFooter).toHaveBeenCalledWith({ footer: "Footer text updated" });
  });
});
