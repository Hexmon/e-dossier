import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getDelegations, POST as createDelegation } from "@/app/api/v1/admin/delegations/route";
import { PATCH as terminateDelegationRoute } from "@/app/api/v1/admin/delegations/[id]/terminate/route";
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
    DELEGATION_CREATED: "delegation.created",
    DELEGATION_REVOKED: "delegation.revoked",
  },
  AuditResourceType: {
    DELEGATION: "delegation",
  },
  computeDiff: vi.fn(() => ({
    changedFields: ["terminatedAt"],
    diff: {
      terminatedAt: {
        before: null,
        after: "2026-04-04T00:00:00.000Z",
      },
    },
  })),
}));

vi.mock("@/app/lib/authz", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/app/db/queries/delegations", () => ({
  createDelegation: vi.fn(),
  listDelegations: vi.fn(),
  terminateDelegation: vi.fn(),
}));

vi.mock("@/app/lib/admin-boundaries", () => ({
  assertCanManageAppointmentRecord: vi.fn(async () => undefined),
  assertCanManageUser: vi.fn(async () => undefined),
}));

vi.mock("@/app/db/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

import { db } from "@/app/db/client";
import { requireAdmin } from "@/app/lib/authz";
import {
  createDelegation as createDelegationQuery,
  listDelegations,
  terminateDelegation,
} from "@/app/db/queries/delegations";
import {
  assertCanManageAppointmentRecord,
  assertCanManageUser,
} from "@/app/lib/admin-boundaries";

const delegationId = "11111111-1111-4111-8111-111111111111";
const appointmentId = "22222222-2222-4222-8222-222222222222";
const granteeUserId = "33333333-3333-4333-8333-333333333333";

describe("admin delegations routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAdmin as any).mockResolvedValue({
      userId: "admin-1",
      roles: ["ADMIN"],
      claims: { apt: { position: "ADMIN" } },
    });
  });

  it("GET lists delegations", async () => {
    (listDelegations as any).mockResolvedValueOnce([
      {
        id: delegationId,
        grantorUsername: "grantor",
        granteeUsername: "grantee",
      },
    ]);

    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/admin/delegations?activeOnly=false",
    });
    const res = await getDelegations(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(listDelegations).toHaveBeenCalledWith({ activeOnly: false });
  });

  it("POST validates delegation payloads", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: "/api/v1/admin/delegations",
      body: {
        grantorAppointmentId: appointmentId,
      },
    });
    const res = await createDelegation(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toBe("Validation failed.");
    expect(createDelegationQuery).not.toHaveBeenCalled();
  });

  it("POST creates a delegation with boundary checks", async () => {
    (createDelegationQuery as any).mockResolvedValueOnce({
      id: delegationId,
      grantorAppointmentId: appointmentId,
      granteeUserId,
      reason: "Officer on leave",
    });
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: delegationId,
              grantorAppointmentId: appointmentId,
              granteeUserId,
              reason: "Officer on leave",
            },
          ],
        }),
      }),
    }));

    const req = makeJsonRequest({
      method: "POST",
      path: "/api/v1/admin/delegations",
      body: {
        grantorAppointmentId: appointmentId,
        granteeUserId,
        startsAt: "2026-04-05T00:00:00.000Z",
        endsAt: "2026-04-10T00:00:00.000Z",
        reason: "Officer on leave",
      },
    });
    const res = await createDelegation(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.item.id).toBe(delegationId);
    expect(assertCanManageAppointmentRecord).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "admin-1" }),
      appointmentId
    );
    expect(assertCanManageUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "admin-1" }),
      granteeUserId
    );
    expect(createDelegationQuery).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      grantorAppointmentId: appointmentId,
      granteeUserId,
      startsAt: new Date("2026-04-05T00:00:00.000Z"),
      endsAt: new Date("2026-04-10T00:00:00.000Z"),
      reason: "Officer on leave",
    });
  });

  it("PATCH terminates a delegation", async () => {
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: delegationId,
              grantorAppointmentId: appointmentId,
              granteeUserId,
            },
          ],
        }),
      }),
    }));
    (terminateDelegation as any).mockResolvedValueOnce({
      before: {
        id: delegationId,
        terminatedAt: null,
      },
      after: {
        id: delegationId,
        terminatedAt: "2026-04-04T00:00:00.000Z",
      },
    });

    const req = makeJsonRequest({
      method: "PATCH",
      path: `/api/v1/admin/delegations/${delegationId}/terminate`,
      body: {
        reason: "Back from leave",
      },
    });
    const res = await terminateDelegationRoute(
      req as any,
      createRouteContext({ id: delegationId })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.item.terminatedAt).toBe("2026-04-04T00:00:00.000Z");
    expect(terminateDelegation).toHaveBeenCalledWith({
      delegationId,
      actorUserId: "admin-1",
      reason: "Back from leave",
    });
  });

  it("returns 403 when admin auth fails", async () => {
    (requireAdmin as any).mockRejectedValueOnce(
      new ApiError(403, "Admin privileges required", "forbidden")
    );

    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/admin/delegations",
    });
    const res = await getDelegations(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("forbidden");
  });
});
