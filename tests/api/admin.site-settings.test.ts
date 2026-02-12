import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getSettings, PUT as putSettings } from "@/app/api/v1/admin/site-settings/route";
import { DELETE as deleteLogo } from "@/app/api/v1/admin/site-settings/logo/route";
import { POST as presignLogo } from "@/app/api/v1/admin/site-settings/logo/presign/route";
import { ApiError } from "@/app/lib/http";
import { makeJsonRequest, createRouteContext } from "../utils/next";

import * as authz from "@/app/lib/authz";
import * as siteQueries from "@/app/db/queries/site-settings";
import * as storage from "@/app/lib/storage";

vi.mock("@/app/lib/authz", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/app/db/queries/site-settings", () => ({
  getOrCreateSiteSettings: vi.fn(async () => ({
    id: "settings-1",
    singletonKey: "default",
    logoUrl: null,
    logoObjectKey: null,
    heroTitle: "MCEME",
    heroDescription: "desc",
    commandersSectionTitle: "Commander's Corner",
    awardsSectionTitle: "Gallantry Awards",
    historySectionTitle: "Our History",
    updatedBy: null,
    createdAt: null,
    updatedAt: null,
  })),
  updateSiteSettings: vi.fn(async (payload: any) => ({
    before: {
      id: "settings-1",
      singletonKey: "default",
      logoUrl: null,
      logoObjectKey: null,
      heroTitle: "MCEME",
      heroDescription: "desc",
      commandersSectionTitle: "Commander's Corner",
      awardsSectionTitle: "Gallantry Awards",
      historySectionTitle: "Our History",
      updatedBy: null,
      createdAt: null,
      updatedAt: null,
    },
    after: {
      id: "settings-1",
      singletonKey: "default",
      logoUrl: payload.logoUrl ?? null,
      logoObjectKey: payload.logoObjectKey ?? null,
      heroTitle: payload.heroTitle ?? "MCEME",
      heroDescription: payload.heroDescription ?? "desc",
      commandersSectionTitle: payload.commandersSectionTitle ?? "Commander's Corner",
      awardsSectionTitle: payload.awardsSectionTitle ?? "Gallantry Awards",
      historySectionTitle: payload.historySectionTitle ?? "Our History",
      updatedBy: "admin-1",
      createdAt: null,
      updatedAt: null,
    },
  })),
  clearSiteLogo: vi.fn(async () => ({
    before: {
      id: "settings-1",
      singletonKey: "default",
      logoUrl: "https://x/logo.png",
      logoObjectKey: "site-settings/logo/a.png",
      heroTitle: "MCEME",
      heroDescription: "desc",
      commandersSectionTitle: "Commander's Corner",
      awardsSectionTitle: "Gallantry Awards",
      historySectionTitle: "Our History",
      updatedBy: null,
      createdAt: null,
      updatedAt: null,
    },
    after: {
      id: "settings-1",
      singletonKey: "default",
      logoUrl: null,
      logoObjectKey: null,
      heroTitle: "MCEME",
      heroDescription: "desc",
      commandersSectionTitle: "Commander's Corner",
      awardsSectionTitle: "Gallantry Awards",
      historySectionTitle: "Our History",
      updatedBy: "admin-1",
      createdAt: null,
      updatedAt: null,
    },
  })),
}));

vi.mock("@/app/lib/storage", () => ({
  createPresignedUploadUrl: vi.fn(async () => "https://upload-url"),
  getPublicObjectUrl: vi.fn(() => "https://public-url"),
  deleteObject: vi.fn(async () => undefined),
}));

const adminPath = "/api/v1/admin/site-settings";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authz.requireAdmin).mockResolvedValue({
    userId: "admin-1",
    roles: ["ADMIN"],
    claims: {},
  } as Awaited<ReturnType<typeof authz.requireAdmin>>);
});

describe("Admin site settings base routes", () => {
  it("GET returns 401 when auth fails", async () => {
    vi.mocked(authz.requireAdmin).mockRejectedValueOnce(
      new ApiError(401, "Unauthorized", "unauthorized")
    );

    const req = makeJsonRequest({ method: "GET", path: adminPath });
    const res = await getSettings(req as any, createRouteContext());

    expect(res.status).toBe(401);
  });

  it("GET returns site settings", async () => {
    const req = makeJsonRequest({ method: "GET", path: adminPath });
    const res = await getSettings(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.settings.id).toBe("settings-1");
    expect(siteQueries.getOrCreateSiteSettings).toHaveBeenCalledTimes(1);
  });

  it("PUT validates payload", async () => {
    const req = makeJsonRequest({ method: "PUT", path: adminPath, body: {} });
    const res = await putSettings(req as any, createRouteContext());

    expect(res.status).toBe(400);
  });

  it("PUT updates settings", async () => {
    const req = makeJsonRequest({
      method: "PUT",
      path: adminPath,
      body: { heroTitle: "New Hero Title" },
    });

    const res = await putSettings(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.settings.heroTitle).toBe("New Hero Title");
    expect(siteQueries.updateSiteSettings).toHaveBeenCalledTimes(1);
  });
});

describe("Admin site settings logo routes", () => {
  it("DELETE logo clears settings and removes object", async () => {
    const req = makeJsonRequest({ method: "DELETE", path: `${adminPath}/logo` });
    const res = await deleteLogo(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.settings.logoUrl).toBeNull();
    expect(siteQueries.clearSiteLogo).toHaveBeenCalledTimes(1);
    expect(storage.deleteObject).toHaveBeenCalledWith("site-settings/logo/a.png");
  });

  it("POST presign validates and returns upload data", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: `${adminPath}/logo/presign`,
      body: { contentType: "image/png", sizeBytes: 1024 },
    });

    const res = await presignLogo(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.uploadUrl).toBe("https://upload-url");
    expect(body.publicUrl).toBe("https://public-url");
  });

  it("POST presign rejects unsupported content type", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: `${adminPath}/logo/presign`,
      body: { contentType: "image/gif", sizeBytes: 1024 },
    });

    const res = await presignLogo(req as any, createRouteContext());
    expect(res.status).toBe(400);
  });
});
