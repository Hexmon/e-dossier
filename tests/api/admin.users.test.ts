import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getUsers } from "@/app/api/v1/admin/users/route";
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
  hasAdminRole: vi.fn((roles?: string[]) => Array.isArray(roles) && roles.includes("ADMIN")),
  requireAuth: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/app/db/queries/users", () => ({
  listUsersWithActiveAppointments: vi.fn(async () => []),
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

const usersPath = "/api/v1/admin/users";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authz.requireAuth).mockResolvedValue({
    userId: "admin-1",
    roles: ["ADMIN"],
    claims: { apt: { position: "ADMIN", scope: { type: "GLOBAL", id: null } } },
  } as Awaited<ReturnType<typeof authz.requireAuth>>);
  vi.mocked(authz.requireAdmin).mockResolvedValue({
    userId: "admin-1",
    roles: ["ADMIN"],
    claims: {},
  } as Awaited<ReturnType<typeof authz.requireAdmin>>);
});

describe("GET /api/v1/admin/users", () => {
  it("returns 403 for an authenticated non-admin, non-PL-CDR caller", async () => {
    vi.mocked(authz.requireAuth).mockResolvedValueOnce(
      {
        userId: "user-1",
        roles: ["USER"],
        claims: { apt: { position: "USER", scope: { type: "GLOBAL", id: null } } },
      } as Awaited<ReturnType<typeof authz.requireAuth>>
    );

    const req = makeJsonRequest({ method: "GET", path: usersPath });
    const res = await getUsers(req as any, createRouteContext());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("forbidden");
  });

  it("returns user rows for a scoped PL CDR caller", async () => {
    vi.mocked(authz.requireAuth).mockResolvedValueOnce(
      {
        userId: "plcdr-1",
        roles: ["PL_CDR"],
        claims: { apt: { position: "PL_CDR", scope: { type: "PLATOON", id: "platoon-1" } } },
      } as Awaited<ReturnType<typeof authz.requireAuth>>
    );
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
