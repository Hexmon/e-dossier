import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/app/lib/http";
import { createRouteContext, makeJsonRequest } from "../utils/next";

const { auditLogMock, selectMock } = vi.hoisted(() => ({
  auditLogMock: vi.fn(async () => undefined),
  selectMock: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  withAuditRoute: (_method: string, handler: any) => async (req: any, context: any) => {
    req.audit = { log: auditLogMock };
    return handler(req, context);
  },
  AuditEventType: {
    API_REQUEST: "api.request",
    POSITION_CREATED: "position.created",
  },
  AuditResourceType: {
    POSITION: "position",
  },
}));

vi.mock("@/app/lib/acx/withAuthz", () => ({
  withAuthz: (handler: any) => handler,
}));

vi.mock("@/app/lib/authz", () => ({
  requireAuth: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/app/db/client", () => ({
  db: {
    select: selectMock,
  },
}));

import { requireAdmin, requireAuth } from "@/app/lib/authz";
import { GET as getAppointmentsRoute } from "@/app/api/v1/admin/appointments/route";
import { GET as getPositionsRoute } from "@/app/api/v1/admin/positions/route";

function buildAppointmentsSelectResult(rows: any[]) {
  return {
    from: vi.fn(() => ({
      innerJoin: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => ({
                offset: vi.fn(async () => rows),
              })),
            })),
          })),
        })),
      })),
    })),
  };
}

function buildPositionsSelectResult(rows: any[]) {
  return {
    from: vi.fn(() => ({
      orderBy: vi.fn(async () => rows),
    })),
  };
}

describe("admin appointments and positions access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a reduced public appointments shape for unauthenticated callers", async () => {
    (requireAuth as any).mockRejectedValueOnce(
      new ApiError(401, "Unauthorized", "unauthorized")
    );

    selectMock.mockImplementationOnce((selection: Record<string, unknown>) => {
      expect(Object.keys(selection)).toEqual(
        expect.arrayContaining([
          "id",
          "positionId",
          "positionKey",
          "positionName",
          "scopeType",
          "scopeId",
          "platoonKey",
          "platoonName",
        ])
      );
      expect(selection).not.toHaveProperty("userId");
      expect(selection).not.toHaveProperty("username");
      expect(selection).not.toHaveProperty("reason");
      expect(selection).not.toHaveProperty("createdAt");
      expect(selection).not.toHaveProperty("updatedAt");

      return buildAppointmentsSelectResult([
        {
          id: "appointment-1",
          positionId: "position-1",
          positionKey: "PLATOON_COMMANDER",
          positionName: "Platoon Commander",
          scopeType: "PLATOON",
          scopeId: "platoon-1",
          platoonKey: "alpha",
          platoonName: "Alpha Platoon",
        },
      ]);
    });

    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/admin/appointments?active=false&userId=11111111-1111-4111-8111-111111111111",
    });
    const res = await getAppointmentsRoute(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([
      expect.objectContaining({
        id: "appointment-1",
        positionName: "Platoon Commander",
        platoonName: "Alpha Platoon",
      }),
    ]);
    expect(body.data[0]).not.toHaveProperty("userId");
    expect(body.data[0]).not.toHaveProperty("username");
    expect(body.data[0]).not.toHaveProperty("reason");
  });

  it("returns the full appointments shape for authenticated admins", async () => {
    (requireAuth as any).mockResolvedValueOnce({
      userId: "admin-1",
      roles: ["ADMIN"],
      claims: { apt: { position: "ADMIN" } },
    });

    selectMock.mockImplementationOnce((selection: Record<string, unknown>) => {
      expect(selection).toHaveProperty("userId");
      expect(selection).toHaveProperty("username");
      expect(selection).toHaveProperty("reason");
      expect(selection).toHaveProperty("createdAt");
      expect(selection).toHaveProperty("updatedAt");

      return buildAppointmentsSelectResult([
        {
          id: "appointment-1",
          userId: "user-1",
          username: "holder-1",
          positionId: "position-1",
          positionKey: "ADMIN",
          positionName: "Admin",
          scopeType: "GLOBAL",
          scopeId: null,
          platoonKey: null,
          platoonName: null,
          startsAt: "2026-04-04T00:00:00.000Z",
          endsAt: null,
          reason: "Initial assignment",
          deletedAt: null,
          createdAt: "2026-04-04T00:00:00.000Z",
          updatedAt: "2026-04-04T00:00:00.000Z",
        },
      ]);
    });

    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/admin/appointments?userId=11111111-1111-4111-8111-111111111111",
    });
    const res = await getAppointmentsRoute(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].username).toBe("holder-1");
    expect(body.data[0].reason).toBe("Initial assignment");
  });

  it("denies unauthenticated GET /api/v1/admin/positions", async () => {
    (requireAdmin as any).mockRejectedValueOnce(
      new ApiError(401, "Unauthorized", "unauthorized")
    );

    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/admin/positions",
    });
    const res = await getPositionsRoute(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("unauthorized");
  });

  it("allows admin GET /api/v1/admin/positions", async () => {
    (requireAdmin as any).mockResolvedValueOnce({
      userId: "admin-1",
      roles: ["ADMIN"],
      claims: { apt: { position: "ADMIN" } },
    });

    selectMock.mockImplementationOnce(() =>
      buildPositionsSelectResult([
        {
          id: "position-1",
          key: "ADMIN",
          displayName: "Admin",
          defaultScope: "GLOBAL",
          singleton: true,
          description: null,
          createdAt: "2026-04-04T00:00:00.000Z",
        },
      ])
    );

    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/admin/positions",
    });
    const res = await getPositionsRoute(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].key).toBe("ADMIN");
  });
});
