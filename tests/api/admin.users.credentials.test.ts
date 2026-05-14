import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as postUsers } from "@/app/api/v1/admin/users/route";
import { PATCH as patchUser } from "@/app/api/v1/admin/users/[id]/route";
import { createRouteContext, makeJsonRequest } from "../utils/next";

const { auditLogMock, selectMock, insertMock, updateMock } = vi.hoisted(() => ({
  auditLogMock: vi.fn(async () => undefined),
  selectMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  withAuditRoute: (_method: string, handler: any) => async (req: any, context: any) => {
    req.audit = { log: auditLogMock };
    return handler(req, context);
  },
  AuditEventType: {
    USER_CREATED: "user.created",
    USER_UPDATED: "user.updated",
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
  requireAuth: vi.fn(),
  hasAdminRole: vi.fn(() => true),
}));

vi.mock("@/app/lib/admin-boundaries", () => ({
  assertCanManageUser: vi.fn(async () => undefined),
}));

vi.mock("@/lib/platoon-commander-access", () => ({
  isBroadScopedPlatoonCommander: vi.fn(() => false),
}));

vi.mock("@/app/db/queries/users", () => ({
  listUsersWithActiveAppointments: vi.fn(async () => []),
}));

vi.mock("@/app/db/client", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
  },
}));

vi.mock("argon2", () => ({
  default: {
    hash: vi.fn(async () => "hashed-password"),
  },
}));

const usersPath = "/api/v1/admin/users";
const userId = "11111111-1111-4111-8111-111111111111";

function validUser(overrides: Record<string, unknown> = {}) {
  return {
    username: "newuser",
    name: "New User",
    email: "new@example.com",
    phone: "9876543210",
    rank: "Maj",
    isActive: true,
    ...overrides,
  };
}

function mockNoDuplicateUser() {
  selectMock.mockImplementationOnce(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => []),
      })),
    })),
  }));
}

function mockCreateUserInsert() {
  insertMock.mockImplementationOnce(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(async () => [
        {
          id: "created-user-1",
          username: "newuser",
          name: "New User",
          email: "new@example.com",
          phone: "9876543210",
          rank: "Maj",
          appointId: null,
          isActive: true,
          deactivatedAt: null,
          deletedAt: null,
          createdAt: "2026-05-14T00:00:00.000Z",
          updatedAt: "2026-05-14T00:00:00.000Z",
        },
      ]),
    })),
  }));
}

function mockCredentialInsert() {
  insertMock.mockImplementationOnce(() => ({
    values: vi.fn(() => ({
      onConflictDoNothing: vi.fn(async () => undefined),
    })),
  }));
}

describe("admin user credential enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects active user creation without an initial password", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: usersPath,
      body: validUser({ password: undefined }),
    });

    const res = await postUsers(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toBe("Password is required for active users.");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("creates an active user with an initial password and credentials", async () => {
    mockNoDuplicateUser();
    mockCreateUserInsert();
    mockCredentialInsert();

    const req = makeJsonRequest({
      method: "POST",
      path: usersPath,
      body: validUser({ password: "Password1" }),
    });

    const res = await postUsers(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.user.id).toBe("created-user-1");
    expect(insertMock).toHaveBeenCalledTimes(2);
  });

  it("allows inactive user creation without a password", async () => {
    mockNoDuplicateUser();
    mockCreateUserInsert();

    const req = makeJsonRequest({
      method: "POST",
      path: usersPath,
      body: validUser({ isActive: false, password: undefined }),
    });

    const res = await postUsers(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it("requires a password before activating a user without credentials", async () => {
    selectMock
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [
              {
                username: "newuser",
                name: "New User",
                email: "new@example.com",
                phone: "9876543210",
                rank: "Maj",
                appointId: null,
                isActive: false,
                deletedAt: null,
                deactivatedAt: new Date(),
              },
            ]),
          })),
        })),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => []),
          })),
        })),
      }));

    const req = makeJsonRequest({
      method: "PATCH",
      path: `${usersPath}/${userId}`,
      body: { isActive: true },
    });

    const res = await patchUser(req as any, createRouteContext({ id: userId }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toBe("Password is required before activating this user.");
    expect(updateMock).not.toHaveBeenCalled();
  });
});
