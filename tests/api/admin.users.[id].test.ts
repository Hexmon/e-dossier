import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE as deleteUserRoute } from "@/app/api/v1/admin/users/[id]/route";
import { createRouteContext, makeJsonRequest } from "../utils/next";

const { selectMock, updateMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  updateMock: vi.fn(),
}));

const auditLogMock = vi.fn(async () => undefined);

vi.mock("@/lib/audit", () => ({
  withAuditRoute: (_method: string, handler: any) => async (req: any, context: any) => {
    req.audit = { log: auditLogMock };
    return handler(req, context);
  },
  AuditEventType: {
    USER_DELETED: "user.deleted",
  },
  AuditResourceType: {
    USER: "user",
  },
}));

vi.mock("@/app/lib/acx/withAuthz", () => ({
  withAuthz: (handler: any) => handler,
}));

vi.mock("@/app/lib/authz", () => ({
  requireAdmin: vi.fn(async () => ({
    userId: "admin-1",
    roles: ["ADMIN"],
    claims: {},
  })),
}));

vi.mock("@/app/lib/admin-boundaries", () => ({
  assertCanManageUser: vi.fn(async () => undefined),
}));

vi.mock("@/app/db/client", () => ({
  db: {
    select: selectMock,
    update: updateMock,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/v1/admin/users/[id]", () => {
  it("returns 409 when the user still has an appointment active through a future endsAt", async () => {
    selectMock.mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ count: 1 }]),
      })),
    }));

    const req = makeJsonRequest({
      method: "DELETE",
      path: "/api/v1/admin/users/11111111-1111-4111-8111-111111111111",
    });

    const res = await deleteUserRoute(
      req as any,
      createRouteContext({ id: "11111111-1111-4111-8111-111111111111" }),
    );
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("conflict");
    expect(body.message).toBe("Cannot delete user who has active appointments.");
  });

  it("soft-deletes the user when there are no currently active appointments", async () => {
    selectMock.mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ count: 0 }]),
      })),
    }));

    updateMock.mockImplementationOnce(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => [{ id: "user-1" }]),
        })),
      })),
    }));

    const req = makeJsonRequest({
      method: "DELETE",
      path: "/api/v1/admin/users/11111111-1111-4111-8111-111111111111",
    });

    const res = await deleteUserRoute(
      req as any,
      createRouteContext({ id: "11111111-1111-4111-8111-111111111111" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe("User soft-deleted.");
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "SUCCESS",
        target: { type: "user", id: "user-1" },
      }),
    );
  });
});
