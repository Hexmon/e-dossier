import { beforeEach, describe, expect, it, vi } from "vitest";

describe("withAuditRoute error safety", () => {
  beforeEach(() => {
    process.env.AUTHZ_V2_ENABLED = "false";
    process.env.NEXT_PUBLIC_AUTHZ_V2_ENABLED = "false";
    vi.resetModules();
    vi.doMock("@hexmon_tech/audit-core", () => ({
      createAuditLogger: vi.fn(() => ({ log: vi.fn() })),
    }));
    vi.doMock("@hexmon_tech/audit-sink-postgres", () => ({
      createPostgresAuditSink: vi.fn(() => ({ name: "mock-postgres-sink" })),
    }));
    vi.doMock("@hexmon_tech/audit-next", () => ({
      withAudit:
        (_logger: unknown, handler: any) =>
        async (req: Request, context: unknown) => {
          const auditReq = Object.assign(req, {
            audit: { log: vi.fn() },
          });
          return handler(auditReq, context);
        },
    }));
  });

  it("returns a JSON error envelope for uncaught handler failures", async () => {
    const { withAuditRoute } = await import("@/lib/audit");
    const route = withAuditRoute("GET", async () => {
      throw Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), {
        code: "ECONNREFUSED",
      });
    });

    const res = await route(
      new Request("http://localhost/api/v1/test", {
        headers: { "x-request-id": "req-1" },
      }) as any,
      { params: Promise.resolve({}) }
    );
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(res.headers.get("x-request-id")).toBe("req-1");
    expect(body).toMatchObject({
      ok: false,
      error: "service_unavailable",
      retryable: true,
    });
    expect(JSON.stringify(body)).not.toContain("127.0.0.1");
  });

  it("wraps protected API handlers with authz when v2 is enabled", async () => {
    process.env.AUTHZ_V2_ENABLED = "true";
    process.env.NEXT_PUBLIC_AUTHZ_V2_ENABLED = "true";
    const withAuthzMock = vi.fn((_handler: any) => async () => {
      return new Response(JSON.stringify({ authz: "checked" }), { status: 209 });
    });

    vi.doMock("@/app/lib/acx/withAuthz", () => ({
      isAuthzRouteHandler: vi.fn(() => false),
      withAuthz: withAuthzMock,
    }));

    const { withAuditRoute } = await import("@/lib/audit");
    const route = withAuditRoute("GET", async () => new Response(null, { status: 204 }));

    const res = await route(
      new Request("http://localhost/api/v1/me", {
        method: "GET",
        headers: { "x-request-id": "req-2" },
      }) as any,
      { params: Promise.resolve({}) }
    );
    const body = await res.json();

    expect(res.status).toBe(209);
    expect(body).toEqual({ authz: "checked" });
    expect(withAuthzMock).toHaveBeenCalledTimes(1);
  });
});
