import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getUsers } from "@/app/api/v1/admin/users/route";
import { ApiError } from "@/app/lib/http";
import { createRouteContext, makeJsonRequest } from "../utils/next";

import * as authz from "@/app/lib/authz";
import * as userQueries from "@/app/db/queries/users";

const auditLogMock = vi.fn(async () => undefined);

vi.mock("@/lib/audit", () => ({
  withAuditRoute: (_method: string, handler: any) => {
    return (req: any, context: any) => {
      req.audit = { log: auditLogMock };
      return handler(req, context);
    };
  },
  AuditEventType: {
    API_REQUEST: "api.request",
  },
  AuditResourceType: {
    USER: "user",
  },
}));

vi.mock("@/app/lib/authz", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/app/db/queries/users", () => ({
  listUsersWithActiveAppointments: vi.fn(async () => []),
}));

const usersPath = "/api/v1/admin/users";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authz.requireAdmin).mockResolvedValue({
    userId: "admin-1",
    roles: ["ADMIN"],
    claims: {},
  } as Awaited<ReturnType<typeof authz.requireAdmin>>);
});

describe("GET /api/v1/admin/users", () => {
  it("returns 403 for a non-admin caller", async () => {
    vi.mocked(authz.requireAdmin).mockRejectedValueOnce(
      new ApiError(403, "Admin privileges required", "forbidden")
    );

    const req = makeJsonRequest({ method: "GET", path: usersPath });
    const res = await getUsers(req as any, createRouteContext());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("forbidden");
  });

  it("returns user rows for an admin caller", async () => {
    vi.mocked(userQueries.listUsersWithActiveAppointments).mockResolvedValueOnce([
      {
        id: "user-1",
        username: "alpha",
        name: "Alpha User",
      },
    ] as any);

    const req = makeJsonRequest({
      method: "GET",
      path: `${usersPath}?limit=10&offset=0`,
    });
    const res = await getUsers(req as any, createRouteContext());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].username).toBe("alpha");
    expect(userQueries.listUsersWithActiveAppointments).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
    });
  });
});
