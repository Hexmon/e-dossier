import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/cookies", () => ({
  readAccessToken: vi.fn(),
}));

vi.mock("@/app/lib/jwt", () => ({
  verifyAccessJWT: vi.fn(),
}));

vi.mock("@/app/lib/access-control-policy", () => ({
  isProtectedAdminApiPath: vi.fn(() => false),
}));

vi.mock("@/app/lib/module-access", () => ({
  assertModuleApiAccessByPath: vi.fn(async () => undefined),
}));

vi.mock("@/app/lib/effective-authority", () => ({
  getActiveAppointmentAuthority: vi.fn(),
  getActiveDelegationAuthority: vi.fn(),
}));

import { makeJsonRequest } from "../utils/next";
import { ApiError } from "@/app/lib/http";
import { requireAuth } from "@/app/lib/authz";
import { readAccessToken } from "@/app/lib/cookies";
import { verifyAccessJWT } from "@/app/lib/jwt";
import {
  getActiveAppointmentAuthority,
  getActiveDelegationAuthority,
} from "@/app/lib/effective-authority";

describe("requireAuth authority validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (readAccessToken as any).mockReturnValue("token");
  });

  it("rejects inactive delegated authority", async () => {
    (verifyAccessJWT as any).mockResolvedValueOnce({
      sub: "user-1",
      roles: ["TRAINING_OFFICER"],
      apt: {
        id: "appointment-1",
        position: "TRAINING_OFFICER",
        scope: { type: "PLATOON", id: "scope-1" },
        auth_kind: "DELEGATION",
        delegation_id: "delegation-1",
      },
    });
    (getActiveDelegationAuthority as any).mockResolvedValueOnce(null);

    await expect(
      requireAuth(
        makeJsonRequest({
          method: "GET",
          path: "/api/v1/me",
          cookies: { access_token: "token" },
        }) as any
      )
    ).rejects.toMatchObject({
      status: 401,
      code: "authority_inactive",
    });
  });

  it("rejects inactive appointments after transfer/end", async () => {
    (verifyAccessJWT as any).mockResolvedValueOnce({
      sub: "user-1",
      roles: ["ADMIN"],
      apt: {
        id: "appointment-1",
        position: "ADMIN",
        scope: { type: "GLOBAL", id: null },
        auth_kind: "APPOINTMENT",
      },
    });
    (getActiveAppointmentAuthority as any).mockResolvedValueOnce(null);

    await expect(
      requireAuth(
        makeJsonRequest({
          method: "GET",
          path: "/api/v1/admin/users",
          cookies: { access_token: "token" },
        }) as any
      )
    ).rejects.toMatchObject({
      status: 401,
      code: "authority_inactive",
    });
  });

  it("returns auth context for active appointment claims", async () => {
    (verifyAccessJWT as any).mockResolvedValueOnce({
      sub: "user-1",
      roles: ["ADMIN"],
      apt: {
        id: "appointment-1",
        position: "ADMIN",
        scope: { type: "GLOBAL", id: null },
        auth_kind: "APPOINTMENT",
      },
    });
    (getActiveAppointmentAuthority as any).mockResolvedValueOnce({
      userId: "user-1",
      appointmentId: "appointment-1",
      positionKey: "ADMIN",
      scopeType: "GLOBAL",
      scopeId: null,
    });

    const result = await requireAuth(
      makeJsonRequest({
        method: "GET",
        path: "/api/v1/me",
        cookies: { access_token: "token" },
      }) as any
    );

    expect(result.userId).toBe("user-1");
    expect(result.roles).toEqual(["ADMIN"]);
  });
});
