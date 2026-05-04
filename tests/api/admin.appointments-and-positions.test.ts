import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/app/lib/http";
import { createRouteContext, makeJsonRequest } from "../utils/next";

const { auditLogMock, selectMock, transactionMock } = vi.hoisted(() => ({
  auditLogMock: vi.fn(async () => undefined),
  selectMock: vi.fn(),
  transactionMock: vi.fn(),
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
  hasAdminRole: vi.fn((roles?: string[]) => Array.isArray(roles) && roles.includes("ADMIN")),
  requireAuth: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/app/lib/admin-boundaries", () => ({
  assertCanAssignAppointment: vi.fn(async () => undefined),
  assertCanManageAppointmentRecord: vi.fn(async () => undefined),
  assertCanManageUser: vi.fn(async () => undefined),
}));

vi.mock("@/lib/platoon-commander-access", () => ({
  isBroadScopedPlatoonCommander: vi.fn(
    (input: { roles?: string[]; position?: string | null; scopeType?: string | null }) =>
      input.scopeType === "PLATOON" &&
      [...(input.roles ?? []), input.position ?? ""].some((token) =>
        ["PL_CDR", "PLATOON_COMMANDER", "PTN_CDR"].includes(token)
      )
  ),
}));

vi.mock("@/app/db/client", () => ({
  db: {
    select: selectMock,
    transaction: transactionMock,
  },
}));

import { requireAdmin, requireAuth } from "@/app/lib/authz";
import { GET as getAppointmentsRoute } from "@/app/api/v1/admin/appointments/route";
import { GET as getPositionsRoute } from "@/app/api/v1/admin/positions/route";
import { PATCH as patchAppointmentRoute } from "@/app/api/v1/admin/appointments/[id]/route";
import { POST as postAppointmentsRoute } from "@/app/api/v1/admin/appointments/route";

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
          "username",
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
      expect(selection).not.toHaveProperty("reason");
      expect(selection).not.toHaveProperty("createdAt");
      expect(selection).not.toHaveProperty("updatedAt");

      return buildAppointmentsSelectResult([
        {
          id: "appointment-1",
          username: "holder-1",
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
        username: "holder-1",
        positionName: "Platoon Commander",
        platoonName: "Alpha Platoon",
      }),
    ]);
    expect(body.data[0]).not.toHaveProperty("userId");
    expect(body.data[0]).not.toHaveProperty("reason");
  });

  it("returns the full appointments shape for authenticated admins, including upcoming holders when requested", async () => {
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
      path: "/api/v1/admin/appointments?active=true&includeFuture=true&userId=11111111-1111-4111-8111-111111111111",
    });
    const res = await getAppointmentsRoute(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].username).toBe("holder-1");
    expect(body.data[0].reason).toBe("Initial assignment");
  });

  it("denies unauthenticated GET /api/v1/admin/positions", async () => {
    (requireAuth as any).mockRejectedValueOnce(
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
    (requireAuth as any).mockResolvedValueOnce({
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

  it("allows scoped PL CDR GET /api/v1/admin/positions", async () => {
    (requireAuth as any).mockResolvedValueOnce({
      userId: "plcdr-1",
      roles: ["PL_CDR"],
      claims: { apt: { position: "PL_CDR", scope: { type: "PLATOON", id: "platoon-1" } } },
    });

    selectMock.mockImplementationOnce(() =>
      buildPositionsSelectResult([
        {
          id: "position-1",
          key: "PL_CDR",
          displayName: "PL CDR",
          defaultScope: "PLATOON",
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
    expect(body.data[0].key).toBe("PL_CDR");
  });

  it("PATCH /api/v1/admin/appointments/[id] updates the appointment holder without mutating usernames", async () => {
    (requireAdmin as any).mockResolvedValueOnce({
      userId: "admin-1",
      roles: ["ADMIN"],
      claims: { apt: { position: "ADMIN" } },
    });

    const updatedAppointment = {
      id: "appointment-1",
      userId: "user-new",
      positionId: "position-1",
      scopeType: "GLOBAL",
      scopeId: null,
      startsAt: "2026-04-04T00:00:00.000Z",
      endsAt: null,
      reason: "Reassigned",
      deletedAt: null,
    };

    const txUpdateMock = vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => [updatedAppointment]),
        })),
      })),
    }));

    transactionMock.mockImplementationOnce(async (callback: (tx: any) => Promise<any>) =>
      callback({
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(async () => [
                {
                  id: "appointment-1",
                  userId: "user-old",
                  positionId: "position-1",
                },
              ]),
            })),
          })),
        })),
        update: txUpdateMock,
      })
    );

    selectMock.mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn(async () => [
                  {
                    id: "appointment-1",
                    userId: "user-new",
                    username: "new-holder",
                    positionId: "position-1",
                    positionKey: "ADMIN",
                    positionName: "Admin",
                    scopeType: "GLOBAL",
                    scopeId: null,
                    platoonKey: null,
                    platoonName: null,
                    startsAt: "2026-04-04T00:00:00.000Z",
                    endsAt: null,
                    reason: "Reassigned",
                    deletedAt: null,
                    createdAt: "2026-04-04T00:00:00.000Z",
                    updatedAt: "2026-04-04T00:00:00.000Z",
                    isActive: true,
                  },
                ]),
              })),
            })),
          })),
        })),
      })),
    }));

    const req = makeJsonRequest({
      method: "PATCH",
      path: "/api/v1/admin/appointments/appointment-1",
      body: {
        userId: "11111111-1111-4111-8111-111111111111",
        username: "new-holder",
        startsAt: "2026-04-04T00:00:00.000Z",
      },
    });

    const res = await patchAppointmentRoute(
      req as any,
      createRouteContext({ id: "appointment-1" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.userId).toBe("user-new");
    expect(txUpdateMock).toHaveBeenCalledTimes(1);
  });

  it("POST /api/v1/admin/appointments returns the conflicting holder in overlap responses", async () => {
    (requireAdmin as any).mockResolvedValueOnce({
      userId: "admin-1",
      roles: ["ADMIN"],
      claims: { apt: { position: "ADMIN" } },
    });

    selectMock.mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [
              {
                id: "appointment-existing",
                userId: "user-existing",
                username: "holder-1",
                startsAt: "2026-04-04T00:00:00.000Z",
                endsAt: null,
              },
            ]),
          })),
        })),
      })),
    }));

    const req = makeJsonRequest({
      method: "POST",
      path: "/api/v1/admin/appointments",
      body: {
        userId: "11111111-1111-4111-8111-111111111111",
        positionId: "708892f8-a211-4ad6-90c1-fe219c7ab03b",
        scopeType: "GLOBAL",
        startsAt: "2026-04-04T00:00:00.000Z",
      },
    });

    const res = await postAppointmentsRoute(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("conflict");
    expect(body.conflictingAppointment).toEqual(
      expect.objectContaining({
        id: "appointment-existing",
        userId: "user-existing",
        username: "holder-1",
      }),
    );
  });
});
