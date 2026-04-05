import { beforeEach, describe, expect, it, vi } from "vitest";

const selectLimitQueue: any[] = [];

vi.mock("argon2", () => ({
  default: {
    hash: vi.fn(async () => "argon2-hash"),
  },
}));

vi.mock("@/app/lib/setup-status", () => ({
  getSetupStatus: vi.fn(),
}));

vi.mock("@/app/db/client", async () => {
  const { users } = await import("@/app/db/schema/auth/users");
  const { credentialsLocal } = await import("@/app/db/schema/auth/credentials");
  const { positions } = await import("@/app/db/schema/auth/positions");
  const { appointments } = await import("@/app/db/schema/auth/appointments");

  const select = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => selectLimitQueue.shift() ?? []),
      })),
    })),
  }));

  const insert = vi.fn((table: unknown) => {
    if (table === users) {
      return {
        values: vi.fn(() => ({
          returning: vi.fn(async () => [{ id: "user-1" }]),
        })),
      };
    }

    if (table === credentialsLocal) {
      return {
        values: vi.fn(async () => undefined),
      };
    }

    if (table === positions) {
      return {
        values: vi.fn(() => ({
          returning: vi.fn(async () => [{ id: "position-1" }]),
        })),
      };
    }

    if (table === appointments) {
      return {
        values: vi.fn(() => ({
          returning: vi.fn(async () => [{ id: "appointment-1" }]),
        })),
      };
    }

    return {
      values: vi.fn(async () => undefined),
    };
  });

  const update = vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(async () => undefined),
    })),
  }));

  return {
    db: {
      select,
      insert,
      update,
    },
  };
});

import { POST as postBootstrap } from "@/app/api/v1/bootstrap/super-admin/route";
import { getSetupStatus } from "@/app/lib/setup-status";
import { makeJsonRequest, createRouteContext } from "../utils/next";

describe("POST /api/v1/bootstrap/super-admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectLimitQueue.length = 0;
  });

  it("creates the first super admin and returns the active appointment id", async () => {
    (getSetupStatus as any).mockResolvedValueOnce({
      bootstrapRequired: true,
    });

    selectLimitQueue.push([], [], [], []);

    const req = makeJsonRequest({
      method: "POST",
      path: "/api/v1/bootstrap/super-admin",
      body: {
        username: "superadmin",
        email: "superadmin@example.mil",
        password: "StrongPass!1",
        name: "Super Admin",
        rank: "SUPER",
      },
    });

    const res = await postBootstrap(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.message).toBe("SUPER_ADMIN bootstrap complete.");
    expect(body.user.username).toBe("superadmin");
    expect(body.appointmentId).toBe("appointment-1");
  });

  it("disables bootstrap after the initial super admin exists", async () => {
    (getSetupStatus as any).mockResolvedValueOnce({
      bootstrapRequired: false,
    });

    const req = makeJsonRequest({
      method: "POST",
      path: "/api/v1/bootstrap/super-admin",
      body: {
        username: "superadmin",
        email: "superadmin@example.mil",
        password: "StrongPass!1",
      },
    });

    const res = await postBootstrap(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.ok).toBe(false);
    expect(body.error).toBe("bootstrap_disabled");
  });
});
