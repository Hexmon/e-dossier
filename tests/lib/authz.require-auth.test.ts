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

vi.mock("@/app/lib/setup-status", () => ({
  getSetupStatus: vi.fn(),
  isSetupStatusUnavailable: (status: any) => status.availability?.ok === false,
}));

import { makeJsonRequest } from "../utils/next";
import { requireAdmin, requireAuth, requireHardSuperAdmin } from "@/app/lib/authz";
import { readAccessToken } from "@/app/lib/cookies";
import { verifyAccessJWT } from "@/app/lib/jwt";
import {
  getActiveAppointmentAuthority,
  getActiveDelegationAuthority,
} from "@/app/lib/effective-authority";
import { getSetupStatus } from "@/app/lib/setup-status";

describe("requireAuth authority validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTHZ_V2_ENABLED = "false";
    process.env.NEXT_PUBLIC_AUTHZ_V2_ENABLED = "false";
    (readAccessToken as any).mockReturnValue("token");
    (getSetupStatus as any).mockResolvedValue({
      bootstrapRequired: false,
      setupComplete: true,
      nextStep: null,
    });
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
          path: "/api/v1/admin/audit-logs",
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

  it("blocks non-admin protected API access while initial setup is incomplete", async () => {
    (verifyAccessJWT as any).mockResolvedValueOnce({
      sub: "user-1",
      roles: ["PLATOON_COMMANDER_EQUIVALENT"],
      apt: {
        id: "appointment-1",
        position: "ARJUNPLCDR",
        scope: { type: "PLATOON", id: "platoon-1" },
        auth_kind: "APPOINTMENT",
      },
    });
    (getActiveAppointmentAuthority as any).mockResolvedValueOnce({
      userId: "user-1",
      appointmentId: "appointment-1",
      positionKey: "ARJUNPLCDR",
      scopeType: "PLATOON",
      scopeId: "platoon-1",
    });
    (getSetupStatus as any).mockResolvedValueOnce({
      bootstrapRequired: false,
      setupComplete: false,
      nextStep: "courses",
    });

    await expect(
      requireAuth(
        makeJsonRequest({
          method: "GET",
          path: "/api/v1/me",
          cookies: { access_token: "token" },
        }) as any
      )
    ).rejects.toMatchObject({
      status: 423,
      code: "setup_incomplete",
      extras: expect.objectContaining({ nextStep: "courses" }),
    });
  });

  it("allows admin setup API access while initial setup is incomplete", async () => {
    (verifyAccessJWT as any).mockResolvedValueOnce({
      sub: "admin-1",
      roles: ["ADMIN"],
      apt: {
        id: "appointment-1",
        position: "ADMIN",
        scope: { type: "GLOBAL", id: null },
        auth_kind: "APPOINTMENT",
      },
    });
    (getActiveAppointmentAuthority as any).mockResolvedValueOnce({
      userId: "admin-1",
      appointmentId: "appointment-1",
      positionKey: "ADMIN",
      scopeType: "GLOBAL",
      scopeId: null,
    });
    (getSetupStatus as any).mockResolvedValueOnce({
      bootstrapRequired: false,
      setupComplete: false,
      nextStep: "courses",
    });

    const result = await requireAuth(
      makeJsonRequest({
        method: "GET",
        path: "/api/v1/admin/courses",
        cookies: { access_token: "token" },
      }) as any
    );

    expect(result.userId).toBe("admin-1");
    expect(result.roles).toEqual(["ADMIN"]);
  });

  it("blocks admin access to non-setup APIs while initial setup is incomplete", async () => {
    (verifyAccessJWT as any).mockResolvedValueOnce({
      sub: "admin-1",
      roles: ["ADMIN"],
      apt: {
        id: "appointment-1",
        position: "ADMIN",
        scope: { type: "GLOBAL", id: null },
        auth_kind: "APPOINTMENT",
      },
    });
    (getActiveAppointmentAuthority as any).mockResolvedValueOnce({
      userId: "admin-1",
      appointmentId: "appointment-1",
      positionKey: "ADMIN",
      scopeType: "GLOBAL",
      scopeId: null,
    });
    (getSetupStatus as any).mockResolvedValueOnce({
      bootstrapRequired: false,
      setupComplete: false,
      nextStep: "courses",
    });

    await expect(
      requireAuth(
        makeJsonRequest({
          method: "GET",
          path: "/api/v1/admin/audit-logs",
          cookies: { access_token: "token" },
        }) as any
      )
    ).rejects.toMatchObject({
      status: 423,
      code: "setup_incomplete",
    });
  });

  it("lets RBAC v2 route permissions decide generic admin API access", async () => {
    process.env.AUTHZ_V2_ENABLED = "true";
    process.env.NEXT_PUBLIC_AUTHZ_V2_ENABLED = "false";
    (verifyAccessJWT as any).mockResolvedValueOnce({
      sub: "pc-1",
      roles: ["PLATOON_COMMANDER_EQUIVALENT"],
      apt: {
        id: "appointment-1",
        position: "ARJUNPLCDR",
        scope: { type: "PLATOON", id: "platoon-1" },
        auth_kind: "APPOINTMENT",
      },
    });
    (getActiveAppointmentAuthority as any).mockResolvedValueOnce({
      userId: "pc-1",
      appointmentId: "appointment-1",
      positionKey: "ARJUNPLCDR",
      scopeType: "PLATOON",
      scopeId: "platoon-1",
    });

    const result = await requireAdmin(
      makeJsonRequest({
        method: "GET",
        path: "/api/v1/admin/module-access",
        cookies: { access_token: "token" },
      }) as any
    );

    expect(result.userId).toBe("pc-1");
    expect(result.roles).toEqual(["PLATOON_COMMANDER_EQUIVALENT"]);
  });

  it("keeps hard super-admin checks outside configurable RBAC", async () => {
    process.env.AUTHZ_V2_ENABLED = "true";
    process.env.NEXT_PUBLIC_AUTHZ_V2_ENABLED = "false";
    (verifyAccessJWT as any).mockResolvedValueOnce({
      sub: "admin-1",
      roles: ["ADMIN"],
      apt: {
        id: "appointment-1",
        position: "ADMIN",
        scope: { type: "GLOBAL", id: null },
        auth_kind: "APPOINTMENT",
      },
    });
    (getActiveAppointmentAuthority as any).mockResolvedValueOnce({
      userId: "admin-1",
      appointmentId: "appointment-1",
      positionKey: "ADMIN",
      scopeType: "GLOBAL",
      scopeId: null,
    });

    await expect(
      requireHardSuperAdmin(
        makeJsonRequest({
          method: "POST",
          path: "/api/v1/admin/users",
          cookies: { access_token: "token" },
        }) as any
      )
    ).rejects.toMatchObject({
      status: 403,
      code: "forbidden",
    });
  });
});
