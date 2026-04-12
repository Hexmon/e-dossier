import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/v1/admin/interview/pending/ticker-setting/route";
import { makeJsonRequest, createRouteContext } from "../utils/next";
import { ApiError } from "@/app/lib/http";
import * as authz from "@/app/lib/authz";
import * as tickerQueries from "@/app/db/queries/interview-pending-ticker-settings";

vi.mock("@/app/lib/authz", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/app/db/queries/interview-pending-ticker-settings", () => ({
  getLatestInterviewPendingTickerSetting: vi.fn(async () => ({
    id: "4da4261e-c94a-48cc-94ab-74d087b991aa",
    startDate: "2026-03-01",
    endDate: "2026-03-10",
    days: 9,
    createdBy: "6ee0ee1f-dca4-4e91-90cc-d067f9a00e42",
    createdByUsername: "plcdr_user",
    createdAt: new Date("2026-03-10T08:00:00.000Z"),
  })),
  listInterviewPendingTickerSettingLogs: vi.fn(async () => [
    {
      id: "4da4261e-c94a-48cc-94ab-74d087b991aa",
      startDate: "2026-03-01",
      endDate: "2026-03-10",
      days: 9,
      createdBy: "6ee0ee1f-dca4-4e91-90cc-d067f9a00e42",
      createdByUsername: "plcdr_user",
      createdAt: new Date("2026-03-10T08:00:00.000Z"),
    },
  ]),
  createInterviewPendingTickerSetting: vi.fn(async (input: any) => ({
    id: "c2521817-b715-4c6d-ab8f-4ef1f18f9700",
    startDate: input.startDate,
    endDate: input.endDate,
    days: input.days,
    createdBy: "6ee0ee1f-dca4-4e91-90cc-d067f9a00e42",
    createdByUsername: "plcdr_user",
    createdAt: new Date("2026-03-10T08:30:00.000Z"),
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authz.requireAuth).mockResolvedValue({
    userId: "6ee0ee1f-dca4-4e91-90cc-d067f9a00e42",
    roles: ["arjunplcdr"],
    claims: {
      apt: {
        position: "arjunplcdr",
        scope: {
          type: "PLATOON",
          id: "f008719d-531f-465f-a90c-47743cfe5031",
        },
      },
    },
  } as Awaited<ReturnType<typeof authz.requireAuth>>);
});

describe("Admin interview pending ticker setting API", () => {
  const basePath = "/api/v1/admin/interview/pending/ticker-setting";

  it("returns 401 when authentication fails", async () => {
    vi.mocked(authz.requireAuth).mockRejectedValueOnce(
      new ApiError(401, "Unauthorized", "unauthorized")
    );

    const req = makeJsonRequest({ method: "GET", path: basePath });
    const res = await GET(req as any, createRouteContext());
    expect(res.status).toBe(401);
  });

  it("GET returns latest setting without logs when includeLogs=false", async () => {
    const req = makeJsonRequest({
      method: "GET",
      path: `${basePath}?includeLogs=false`,
    });

    const res = await GET(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.setting.days).toBe(9);
    expect(body.logs).toEqual([]);
    expect(tickerQueries.listInterviewPendingTickerSettingLogs).not.toHaveBeenCalled();
  });

  it("GET returns logs when includeLogs=true", async () => {
    const req = makeJsonRequest({
      method: "GET",
      path: `${basePath}?includeLogs=true&limit=10&offset=0`,
    });

    const res = await GET(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.logs).toHaveLength(1);
    expect(tickerQueries.listInterviewPendingTickerSettingLogs).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
    });
  });

  it("returns 403 for non-admin users outside platoon scope", async () => {
    vi.mocked(authz.requireAuth).mockResolvedValueOnce({
      userId: "user-2",
      roles: ["TRAINING_OFFICER"],
      claims: {
        apt: {
          position: "TRAINING_OFFICER",
          scope: {
            type: "GLOBAL",
            id: null,
          },
        },
      },
    } as Awaited<ReturnType<typeof authz.requireAuth>>);

    const req = makeJsonRequest({
      method: "GET",
      path: `${basePath}?includeLogs=false`,
    });

    const res = await GET(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.message).toBe("Forbidden: ticker setting access denied.");
  });

  it("POST validates start/end range", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: basePath,
      body: {
        startDate: "2026-03-12",
        endDate: "2026-03-10",
      },
    });

    const res = await POST(req as any, createRouteContext());
    expect(res.status).toBe(400);
  });

  it("POST saves setting and returns computed days", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: basePath,
      body: {
        startDate: "2026-03-01",
        endDate: "2026-03-10",
      },
    });

    const res = await POST(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.setting.days).toBe(9);
    expect(tickerQueries.createInterviewPendingTickerSetting).toHaveBeenCalledWith(
      {
        startDate: "2026-03-01",
        endDate: "2026-03-10",
        days: 9,
      },
      "6ee0ee1f-dca4-4e91-90cc-d067f9a00e42"
    );
  });
});
