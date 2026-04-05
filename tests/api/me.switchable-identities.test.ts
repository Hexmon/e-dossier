import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/me/switchable-identities/route";
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
  },
  AuditResourceType: {
    USER: "user",
  },
}));

vi.mock("@/app/lib/guard", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/app/lib/effective-authority", () => ({
  listSwitchableIdentities: vi.fn(),
}));

import { requireAuth } from "@/app/lib/guard";
import { listSwitchableIdentities } from "@/app/lib/effective-authority";

describe("GET /api/v1/me/switchable-identities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue({
      userId: "user-1",
      roles: ["ADMIN"],
      claims: {},
    });
  });

  it("returns normalized switchable identities", async () => {
    (listSwitchableIdentities as any).mockResolvedValueOnce([
      {
        kind: "APPOINTMENT",
        id: "appointment-1",
        label: "Admin",
        userId: "user-1",
        username: "currentuser",
        positionKey: "ADMIN",
        positionName: "Admin",
        scopeType: "GLOBAL",
        scopeId: null,
        platoonName: null,
        grantorLabel: null,
        appointmentId: "appointment-1",
        delegationId: null,
      },
      {
        kind: "DELEGATION",
        id: "delegation-1",
        label: "Acting Commander",
        userId: "user-1",
        username: "currentuser",
        positionKey: "TRAINING_OFFICER",
        positionName: "Training Officer",
        scopeType: "PLATOON",
        scopeId: "scope-1",
        platoonName: "Alpha Platoon",
        grantorLabel: "grantor-user",
        appointmentId: "appointment-2",
        delegationId: "delegation-1",
      },
    ]);

    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/me/switchable-identities",
    });
    const res = await GET(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(listSwitchableIdentities).toHaveBeenCalledWith("user-1");
    expect(body.items).toHaveLength(2);
    expect(body.items[0].userId).toBe("user-1");
    expect(body.items[1].kind).toBe("DELEGATION");
    expect(body.items[1].grantorLabel).toBe("grantor-user");
  });

  it("scopes switchable identities to the authenticated user id", async () => {
    (listSwitchableIdentities as any).mockImplementationOnce(async (userId: string) => {
      expect(userId).toBe("user-1");
      return [
        {
          kind: "APPOINTMENT",
          id: "appointment-1",
          label: "Admin",
          userId,
          username: "currentuser",
          positionKey: "ADMIN",
          positionName: "Admin",
          scopeType: "GLOBAL",
          scopeId: null,
          platoonName: null,
          grantorLabel: null,
          appointmentId: "appointment-1",
          delegationId: null,
        },
      ];
    });

    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/me/switchable-identities",
    });
    const res = await GET(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(listSwitchableIdentities).not.toHaveBeenCalledWith("user-2");
    expect(body.items).toEqual([
      expect.objectContaining({
        userId: "user-1",
        appointmentId: "appointment-1",
      }),
    ]);
  });

  it("returns 401 when auth fails", async () => {
    (requireAuth as any).mockRejectedValueOnce(
      new ApiError(401, "Unauthorized", "unauthorized")
    );

    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/me/switchable-identities",
    });
    const res = await GET(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("unauthorized");
  });
});
