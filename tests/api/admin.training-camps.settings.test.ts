import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, PATCH } from "@/app/api/v1/admin/training-camps/settings/route";
import { ApiError } from "@/app/lib/http";
import { makeJsonRequest, createRouteContext } from "../utils/next";

vi.mock("@/app/lib/acx/withAuthz", () => ({
  withAuthz: (handler: any) => handler,
}));

vi.mock("@/lib/audit", () => ({
  withAuditRoute: (_method: string, handler: any) => async (req: any, context: any) => {
    req.audit = { log: vi.fn(async () => undefined) };
    return handler(req, context);
  },
  AuditEventType: {
    API_REQUEST: "api.request",
  },
  AuditResourceType: {
    API: "api",
  },
}));

vi.mock("@/app/lib/authz", () => ({
  requireAuth: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/app/db/queries/trainingCamps", () => ({
  getTrainingCampSettings: vi.fn(),
  updateTrainingCampSettings: vi.fn(),
}));

import { requireAuth, requireAdmin } from "@/app/lib/authz";
import {
  getTrainingCampSettings,
  updateTrainingCampSettings,
} from "@/app/db/queries/trainingCamps";

describe("admin training camp settings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      userId: "pc-1",
      roles: ["PLATOON_COMMANDER_EQUIVALENT"],
      claims: {
        apt: {
          position: "PLATOON_COMMANDER",
        },
      },
    } as Awaited<ReturnType<typeof requireAuth>>);
    vi.mocked(requireAdmin).mockResolvedValue({
      userId: "admin-1",
      roles: ["ADMIN"],
      claims: {},
    } as Awaited<ReturnType<typeof requireAdmin>>);
    vi.mocked(getTrainingCampSettings).mockResolvedValue({
      id: "settings-1",
      singletonKey: "default",
      maxCampsPerSemester: 2,
      createdAt: "2026-04-11T00:00:00.000Z",
      updatedAt: "2026-04-11T00:00:00.000Z",
    } as Awaited<ReturnType<typeof getTrainingCampSettings>>);
    vi.mocked(updateTrainingCampSettings).mockResolvedValue({
      id: "settings-1",
      singletonKey: "default",
      maxCampsPerSemester: 3,
      createdAt: "2026-04-11T00:00:00.000Z",
      updatedAt: "2026-04-11T00:05:00.000Z",
    } as Awaited<ReturnType<typeof updateTrainingCampSettings>>);
  });

  it("allows authenticated non-admin callers to read training camp settings", async () => {
    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/admin/training-camps/settings",
    });

    const res = await GET(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.settings.maxCampsPerSemester).toBe(2);
    expect(requireAuth).toHaveBeenCalledTimes(1);
    expect(requireAdmin).not.toHaveBeenCalled();
  });

  it("returns 401 when read auth fails", async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(
      new ApiError(401, "Unauthorized", "unauthorized")
    );

    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/admin/training-camps/settings",
    });

    const res = await GET(req as any, createRouteContext());

    expect(res.status).toBe(401);
  });

  it("keeps PATCH admin-protected", async () => {
    vi.mocked(requireAdmin).mockRejectedValueOnce(
      new ApiError(403, "Admin privileges required", "forbidden")
    );

    const req = makeJsonRequest({
      method: "PATCH",
      path: "/api/v1/admin/training-camps/settings",
      body: { maxCampsPerSemester: 3 },
    });

    const res = await PATCH(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("forbidden");
    expect(requireAdmin).toHaveBeenCalledTimes(1);
  });

  it("updates settings for admins", async () => {
    const req = makeJsonRequest({
      method: "PATCH",
      path: "/api/v1/admin/training-camps/settings",
      body: { maxCampsPerSemester: 3 },
    });

    const res = await PATCH(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.settings.maxCampsPerSemester).toBe(3);
    expect(updateTrainingCampSettings).toHaveBeenCalledWith({ maxCampsPerSemester: 3 });
  });
});
