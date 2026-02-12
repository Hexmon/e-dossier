import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getMeDeviceSettings } from "@/app/api/v1/me/device-site-settings/route";
import { makeJsonRequest, createRouteContext } from "../utils/next";
import { ApiError } from "@/app/lib/http";
import * as authz from "@/app/lib/authz";
import * as settingsQueries from "@/app/db/queries/device-site-settings";

vi.mock("@/app/lib/authz", () => ({
  requireAdmin: vi.fn(),
  requireAuth: vi.fn(),
}));

vi.mock("@/app/db/queries/device-site-settings", () => ({
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

const mePath = "/api/v1/me/device-site-settings";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authz.requireAuth).mockResolvedValue({
    userId: "user-1",
    roles: ["USER"],
    claims: {},
  } as Awaited<ReturnType<typeof authz.requireAuth>>);
});

describe("GET /api/v1/me/device-site-settings", () => {
  it("returns 401 when auth fails", async () => {
    vi.mocked(authz.requireAuth).mockRejectedValueOnce(
      new ApiError(401, "Unauthorized", "unauthorized")
    );

    const req = makeJsonRequest({ method: "GET", path: mePath });
    const res = await getMeDeviceSettings(req as any, createRouteContext());

    expect(res.status).toBe(401);
  });

  it("returns settings using explicit query deviceId", async () => {
    const req = makeJsonRequest({ method: "GET", path: `${mePath}?deviceId=device-1234` });
    const res = await getMeDeviceSettings(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.deviceId).toBe("device-1234");
    expect(body.settings.deviceId).toBe("device-1234");
    expect(settingsQueries.getEffectiveDeviceSiteSettings).toHaveBeenCalledWith("device-1234");
  });

  it("resolves deviceId from x-device-id header when query is absent", async () => {
    const req = makeJsonRequest({
      method: "GET",
      path: mePath,
      headers: { "x-device-id": "device-header-1234" },
    });

    const res = await getMeDeviceSettings(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.deviceId).toBe("device-header-1234");
  });

  it("returns defaults when no deviceId can be resolved", async () => {
    const req = makeJsonRequest({ method: "GET", path: mePath });
    const res = await getMeDeviceSettings(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.deviceId).toBeNull();
    expect(body.settings.themeMode).toBe("system");
    expect(settingsQueries.buildDefaultDeviceSiteSettings).toHaveBeenCalledWith("");
  });
});
