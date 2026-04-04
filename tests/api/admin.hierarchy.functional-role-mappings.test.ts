import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  GET,
  PUT,
} from "@/app/api/v1/admin/hierarchy/functional-role-mappings/route";
import { ApiError } from "@/app/lib/http";
import { createRouteContext, makeJsonRequest } from "../utils/next";

const auditLogMock = vi.fn(async () => undefined);

vi.mock("@/lib/audit", () => ({
  withAuditRoute: (_method: string, handler: any) => (req: any, context: any) => {
    req.audit = { log: auditLogMock };
    return handler(req, context);
  },
  AuditEventType: {
    API_REQUEST: "api.request",
    POSITION_UPDATED: "position.updated",
  },
  AuditResourceType: {
    API: "api",
  },
  computeDiff: vi.fn(() => ({
    changedFields: ["positionId"],
    diff: { positionId: { before: null, after: "position-1" } },
  })),
}));

vi.mock("@/app/lib/authz", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/app/db/queries/functional-role-mappings", () => ({
  getCommanderEquivalentMapping: vi.fn(),
  resolveCommanderEquivalentMapping: vi.fn(),
  updateCommanderEquivalentMapping: vi.fn(),
}));

vi.mock("@/app/lib/admin-boundaries", () => ({
  isProtectedSystemPositionId: vi.fn(async () => false),
}));

vi.mock("@/app/db/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

import { db } from "@/app/db/client";
import { requireAdmin } from "@/app/lib/authz";
import {
  getCommanderEquivalentMapping,
  resolveCommanderEquivalentMapping,
  updateCommanderEquivalentMapping,
} from "@/app/db/queries/functional-role-mappings";
import { isProtectedSystemPositionId } from "@/app/lib/admin-boundaries";

describe("functional role mapping admin route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAdmin as any).mockResolvedValue({
      userId: "admin-1",
      roles: ["ADMIN"],
      claims: { apt: { position: "ADMIN" } },
    });
    (getCommanderEquivalentMapping as any).mockResolvedValue(null);
    (resolveCommanderEquivalentMapping as any).mockResolvedValue(null);
  });

  it("GET returns configured and effective commander-equivalent mappings", async () => {
    (getCommanderEquivalentMapping as any).mockResolvedValueOnce({
      id: "mapping-1",
      capabilityKey: "PLATOON_COMMANDER_EQUIVALENT",
      positionId: "position-1",
      positionKey: "TRAINING_OFFICER",
      positionName: "Training Officer",
      defaultScope: "PLATOON",
      source: "mapping",
    });
    (resolveCommanderEquivalentMapping as any).mockResolvedValueOnce({
      id: "mapping-1",
      capabilityKey: "PLATOON_COMMANDER_EQUIVALENT",
      positionId: "position-1",
      positionKey: "TRAINING_OFFICER",
      positionName: "Training Officer",
      defaultScope: "PLATOON",
      source: "mapping",
    });

    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/admin/hierarchy/functional-role-mappings",
    });
    const res = await GET(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.configured.positionKey).toBe("TRAINING_OFFICER");
    expect(body.effective.positionName).toBe("Training Officer");
  });

  it("PUT blocks ADMIN from mapping a non-platoon-scoped position", async () => {
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: "position-1",
              key: "ADMIN",
              defaultScope: "GLOBAL",
            },
          ],
        }),
      }),
    }));

    const req = makeJsonRequest({
      method: "PUT",
      path: "/api/v1/admin/hierarchy/functional-role-mappings",
      body: {
        commanderEquivalentPositionId: "11111111-1111-4111-8111-111111111111",
      },
    });
    const res = await PUT(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("forbidden");
    expect(updateCommanderEquivalentMapping).not.toHaveBeenCalled();
  });

  it("PUT blocks ADMIN from mapping to a protected system position", async () => {
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: "position-2",
              key: "TRAINING_OFFICER",
              defaultScope: "PLATOON",
            },
          ],
        }),
      }),
    }));
    (isProtectedSystemPositionId as any).mockResolvedValueOnce(true);

    const req = makeJsonRequest({
      method: "PUT",
      path: "/api/v1/admin/hierarchy/functional-role-mappings",
      body: {
        commanderEquivalentPositionId: "22222222-2222-4222-8222-222222222222",
      },
    });
    const res = await PUT(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("forbidden");
    expect(updateCommanderEquivalentMapping).not.toHaveBeenCalled();
  });

  it("PUT allows SUPER_ADMIN to clear the mapping", async () => {
    (requireAdmin as any).mockResolvedValueOnce({
      userId: "super-1",
      roles: ["SUPER_ADMIN"],
      claims: { apt: { position: "SUPER_ADMIN" } },
    });
    (updateCommanderEquivalentMapping as any).mockResolvedValueOnce({
      before: { positionId: "position-1" },
      after: {
        id: "mapping-1",
        capabilityKey: "PLATOON_COMMANDER_EQUIVALENT",
        positionId: null,
      },
    });

    const req = makeJsonRequest({
      method: "PUT",
      path: "/api/v1/admin/hierarchy/functional-role-mappings",
      body: {
        commanderEquivalentPositionId: null,
      },
    });
    const res = await PUT(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.mapping.positionId).toBeNull();
    expect(updateCommanderEquivalentMapping).toHaveBeenCalledWith(null, "super-1");
  });

  it("returns 403 when admin auth fails", async () => {
    (requireAdmin as any).mockRejectedValueOnce(
      new ApiError(403, "Admin privileges required", "forbidden")
    );

    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/admin/hierarchy/functional-role-mappings",
    });
    const res = await GET(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("forbidden");
  });
});
