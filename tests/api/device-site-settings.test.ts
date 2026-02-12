import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getAdminSettings, PUT as putAdminSettings } from "@/app/api/v1/admin/device-site-settings/route";
import { GET as getLegacySettings, PUT as putLegacySettings } from "@/app/api/v1/settings/device-site/route";
import { makeJsonRequest, createRouteContext } from "../utils/next";
import { ApiError } from "@/app/lib/http";
import * as authz from "@/app/lib/authz";
import * as settingsQueries from "@/app/db/queries/device-site-settings";

vi.mock("@/app/lib/authz", () => ({
  requireAdmin: vi.fn(),
  requireAuth: vi.fn(),
}));

vi.mock("@/app/db/queries/device-site-settings", () => ({
  getDeviceSiteSettingsByDeviceId: vi.fn(async () => null),
  getEffectiveDeviceSiteSettings: vi.fn(async (deviceId: string) => ({
    id: null,
    deviceId,
    themeMode: "system",
    themePreset: "navy-steel",
    accentPalette: "blue",
    density: "comfortable",
    language: "en",
    timezone: "Asia/Kolkata",
    refreshIntervalSec: 60,
    createdAt: null,
    updatedAt: null,
    updatedBy: null,
  })),
  listDeviceSiteSettings: vi.fn(async () => []),
  upsertDeviceSiteSettings: vi.fn(async (input: any, actorUserId: string) => ({
    id: "setting-1",
    deviceId: input.deviceId,
    themeMode: input.themeMode,
    themePreset: input.themePreset,
    accentPalette: input.accentPalette,
    density: input.density,
    language: input.language,
    timezone: input.timezone,
    refreshIntervalSec: input.refreshIntervalSec,
    createdAt: new Date(),
    updatedAt: new Date(),
    updatedBy: actorUserId,
  })),
  buildDefaultDeviceSiteSettings: vi.fn((deviceId: string) => ({
    id: null,
    deviceId,
    themeMode: "system",
    themePreset: "navy-steel",
    accentPalette: "blue",
    density: "comfortable",
    language: "en",
    timezone: "Asia/Kolkata",
    refreshIntervalSec: 60,
    createdAt: null,
    updatedAt: null,
    updatedBy: null,
  })),
}));

const adminPath = "/api/v1/admin/device-site-settings";
const legacyPath = "/api/v1/settings/device-site";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authz.requireAdmin).mockResolvedValue({
    userId: "admin-1",
    roles: ["ADMIN"],
    claims: {},
  } as Awaited<ReturnType<typeof authz.requireAdmin>>);
  vi.mocked(authz.requireAuth).mockResolvedValue({
    userId: "user-1",
    roles: ["PLATOON_COMMANDER"],
    claims: {},
  } as Awaited<ReturnType<typeof authz.requireAuth>>);
});

describe("Admin device site settings API", () => {
  it("GET returns 401 when admin auth fails", async () => {
    vi.mocked(authz.requireAdmin).mockRejectedValueOnce(
      new ApiError(401, "Unauthorized", "unauthorized")
    );

    const req = makeJsonRequest({ method: "GET", path: `${adminPath}?deviceId=device-1234` });
    const res = await getAdminSettings(req as any, createRouteContext());

    expect(res.status).toBe(401);
  });

  it("GET returns effective settings for a device", async () => {
    const req = makeJsonRequest({ method: "GET", path: `${adminPath}?deviceId=device-1234` });
    const res = await getAdminSettings(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.settings.deviceId).toBe("device-1234");
    expect(settingsQueries.getEffectiveDeviceSiteSettings).toHaveBeenCalledWith("device-1234");
  });

  it("GET returns paginated list when deviceId is absent", async () => {
    vi.mocked(settingsQueries.listDeviceSiteSettings).mockResolvedValueOnce([
      {
        id: "setting-1",
        deviceId: "device-1234",
        themeMode: "dark",
        themePreset: "navy-steel",
        accentPalette: "teal",
        density: "compact",
        language: "en",
        timezone: "Asia/Kolkata",
        refreshIntervalSec: 120,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: "admin-1",
      },
    ] as any);

    const req = makeJsonRequest({ method: "GET", path: `${adminPath}?limit=5&offset=0` });
    const res = await getAdminSettings(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.pagination.limit).toBe(5);
  });

  it("PUT returns 403 for non-admin", async () => {
    vi.mocked(authz.requireAdmin).mockRejectedValueOnce(
      new ApiError(403, "Admin privileges required", "forbidden")
    );

    const req = makeJsonRequest({
      method: "PUT",
      path: adminPath,
      body: {
        deviceId: "device-1234",
        themeMode: "dark",
        themePreset: "navy-steel",
        accentPalette: "blue",
        density: "compact",
        language: "en",
        timezone: "Asia/Kolkata",
        refreshIntervalSec: 60,
      },
    });

    const res = await putAdminSettings(req as any, createRouteContext());
    expect(res.status).toBe(403);
  });

  it("PUT validates payload", async () => {
    const req = makeJsonRequest({
      method: "PUT",
      path: adminPath,
      body: {
        deviceId: "device-1234",
        themeMode: "dark",
        themePreset: "unknown",
      },
    });

    const res = await putAdminSettings(req as any, createRouteContext());
    expect(res.status).toBe(400);
  });

  it("PUT rejects unknown accentPalette values", async () => {
    const req = makeJsonRequest({
      method: "PUT",
      path: adminPath,
      body: {
        deviceId: "device-1234",
        accentPalette: "cyan",
      },
    });

    const res = await putAdminSettings(req as any, createRouteContext());
    expect(res.status).toBe(400);
  });

  it("PUT enforces refresh interval bounds", async () => {
    const req = makeJsonRequest({
      method: "PUT",
      path: adminPath,
      body: {
        deviceId: "device-1234",
        themeMode: "dark",
        themePreset: "navy-steel",
        accentPalette: "purple",
        density: "compact",
        language: "en",
        timezone: "Asia/Kolkata",
        refreshIntervalSec: 901,
      },
    });

    const res = await putAdminSettings(req as any, createRouteContext());
    expect(res.status).toBe(400);
  });

  it("PUT defaults accentPalette to blue when omitted", async () => {
    const req = makeJsonRequest({
      method: "PUT",
      path: adminPath,
      body: {
        deviceId: "device-1234",
        themeMode: "dark",
        themePreset: "navy-steel",
        density: "compact",
        language: "en",
        timezone: "Asia/Kolkata",
        refreshIntervalSec: 120,
      },
    });

    const res = await putAdminSettings(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.settings.accentPalette).toBe("blue");
  });

  it("PUT upserts device settings", async () => {
    const req = makeJsonRequest({
      method: "PUT",
      path: adminPath,
      body: {
        deviceId: "device-1234",
        themeMode: "dark",
        themePreset: "navy-steel",
        accentPalette: "amber",
        density: "compact",
        language: "en",
        timezone: "Asia/Kolkata",
        refreshIntervalSec: 120,
      },
    });

    const res = await putAdminSettings(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.settings.deviceId).toBe("device-1234");
    expect(body.settings.accentPalette).toBe("amber");
    expect(settingsQueries.upsertDeviceSiteSettings).toHaveBeenCalledTimes(1);
  });
});

describe("Legacy /api/v1/settings/device-site alias", () => {
  it("GET allows authenticated users", async () => {
    const req = makeJsonRequest({ method: "GET", path: `${legacyPath}?deviceId=device-1234` });
    const res = await getLegacySettings(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.settings.deviceId).toBe("device-1234");
  });

  it("PUT allows authenticated users", async () => {
    const req = makeJsonRequest({
      method: "PUT",
      path: legacyPath,
      body: {
        deviceId: "device-1234",
        themeMode: "light",
        themePreset: "navy-steel",
        accentPalette: "blue",
        density: "comfortable",
        language: "en",
        timezone: "Asia/Kolkata",
        refreshIntervalSec: 60,
      },
    });

    const res = await putLegacySettings(req as any, createRouteContext());
    expect(res.status).toBe(200);
  });
});
