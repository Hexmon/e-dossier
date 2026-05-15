import { beforeEach, describe, expect, it, vi } from "vitest";

describe("withAuditRoute error safety", () => {
  beforeEach(() => {
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
});
