import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/app/lib/jwt", () => ({
  verifyAccessJWT: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  generateCsrfToken: vi.fn(async () => "csrf-token"),
  setCsrfCookie: vi.fn((response: Response) => response),
  validateCsrfToken: vi.fn(async () => true),
  requiresCsrfProtection: vi.fn((method: string) =>
    ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())
  ),
}));

vi.mock("@/lib/ratelimit", () => ({
  getClientIp: vi.fn(() => "127.0.0.1"),
  checkApiRateLimit: vi.fn(async () => ({
    success: true,
    limit: 50,
    remaining: 50,
    reset: Date.now() + 60_000,
  })),
  getRateLimitHeaders: vi.fn(() => ({})),
}));

vi.mock("@/config/ratelimit.config", () => ({
  isRateLimitEnabled: vi.fn(() => false),
  shouldExcludeHealthCheck: vi.fn(() => true),
}));

import { verifyAccessJWT } from "@/app/lib/jwt";
import { middleware } from "@/middleware";

function makeRequest(path: string, options?: { method?: string; token?: string }) {
  const headers = new Headers();
  if (options?.token) {
    headers.set("cookie", `access_token=${options.token}`);
  }

  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method: options?.method ?? "GET",
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("middleware access-control hardening", () => {
  it("redirects unauthenticated dashboard traffic to login", async () => {
    const res = await middleware(makeRequest("/dashboard/genmgmt"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("allows an authenticated ordinary dashboard user through /dashboard/genmgmt", async () => {
    vi.mocked(verifyAccessJWT).mockResolvedValueOnce({
      sub: "pc-1",
      roles: ["PLATOON_COMMANDER"],
      apt: {
        position: "PLATOON_COMMANDER",
      },
    } as any);

    const res = await middleware(makeRequest("/dashboard/genmgmt", { token: "pc-token" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("allows an admin to access /dashboard/genmgmt", async () => {
    vi.mocked(verifyAccessJWT).mockResolvedValueOnce({
      sub: "admin-1",
      roles: ["ADMIN"],
      apt: {
        position: "ADMIN",
      },
    } as any);

    const res = await middleware(makeRequest("/dashboard/genmgmt", { token: "admin-token" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("allows an admin to reach /dashboard/reports and defer policy checks to server layouts", async () => {
    vi.mocked(verifyAccessJWT).mockResolvedValueOnce({
      sub: "admin-1",
      roles: ["ADMIN"],
      apt: {
        position: "ADMIN",
      },
    } as any);

    const res = await middleware(makeRequest("/dashboard/reports", { token: "admin-token" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("allows an ordinary dashboard user to access /dashboard/reports", async () => {
    vi.mocked(verifyAccessJWT).mockResolvedValueOnce({
      sub: "pc-1",
      roles: ["PLATOON_COMMANDER"],
      apt: {
        position: "PLATOON_COMMANDER",
      },
    } as any);

    const res = await middleware(makeRequest("/dashboard/reports", { token: "pc-token" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("returns 403 for a non-admin caller on protected admin APIs", async () => {
    vi.mocked(verifyAccessJWT).mockResolvedValueOnce({
      sub: "pc-1",
      roles: ["PLATOON_COMMANDER"],
      apt: {
        position: "PLATOON_COMMANDER",
      },
    } as any);

    const res = await middleware(makeRequest("/api/v1/admin/users", { token: "pc-token" }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("forbidden");
  });

  it("allows authenticated non-admin callers to reach shared read-only admin metadata endpoints", async () => {
    vi.mocked(verifyAccessJWT).mockResolvedValueOnce({
      sub: "pc-1",
      roles: ["PLATOON_COMMANDER"],
      apt: {
        position: "PLATOON_COMMANDER",
      },
    } as any);

    const res = await middleware(makeRequest("/api/v1/admin/courses", { token: "pc-token" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it.each([
    "/api/v1/admin/interview/templates",
    "/api/v1/admin/training-camps",
    "/api/v1/admin/training-camps/settings",
    "/api/v1/admin/physical-training/templates",
  ])(
    "allows authenticated non-admin callers to reach shared read-only admin endpoint %s",
    async (path) => {
      vi.mocked(verifyAccessJWT).mockResolvedValueOnce({
        sub: "pc-1",
        roles: ["PLATOON_COMMANDER"],
        apt: {
          position: "PLATOON_COMMANDER",
        },
      } as any);

      const res = await middleware(makeRequest(path, { token: "pc-token" }));

      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    }
  );

  it("keeps write methods on shared admin metadata endpoints admin-protected", async () => {
    vi.mocked(verifyAccessJWT).mockResolvedValueOnce({
      sub: "pc-1",
      roles: ["PLATOON_COMMANDER"],
      apt: {
        position: "PLATOON_COMMANDER",
      },
    } as any);

    const res = await middleware(
      makeRequest("/api/v1/admin/courses", { method: "POST", token: "pc-token" })
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("forbidden");
  });

  it.each([
    { path: "/api/v1/admin/interview/templates", method: "POST" },
    { path: "/api/v1/admin/training-camps", method: "POST" },
    { path: "/api/v1/admin/training-camps/settings", method: "PATCH" },
    { path: "/api/v1/admin/physical-training/types", method: "POST" },
  ])(
    "keeps shared admin endpoint $path with method $method admin-protected",
    async ({ path, method }) => {
      vi.mocked(verifyAccessJWT).mockResolvedValueOnce({
        sub: "pc-1",
        roles: ["PLATOON_COMMANDER"],
        apt: {
          position: "PLATOON_COMMANDER",
        },
      } as any);

      const res = await middleware(makeRequest(path, { method, token: "pc-token" }));

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("forbidden");
    }
  );
});
