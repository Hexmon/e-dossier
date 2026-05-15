import { describe, expect, it, vi } from "vitest";

import { handleApiError, isDatabaseUnavailableError } from "@/app/lib/http";

describe("API error handling", () => {
  it("maps database connection failures to a safe 503 envelope", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("Failed query: select count(*)::int from positions"), {
      cause: Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), {
        code: "ECONNREFUSED",
      }),
    });

    const res = handleApiError(error);
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      status: 503,
      error: "service_unavailable",
      retryable: true,
      service: "database",
    });
    expect(body.message).toBe(
      "Database is temporarily unavailable. Please try again after the service is restored."
    );
    expect(JSON.stringify(body)).not.toContain("select count");
    expect(JSON.stringify(body)).not.toContain("127.0.0.1");

    consoleSpy.mockRestore();
  });

  it("detects database unavailable errors through nested causes", () => {
    const error = { cause: { cause: { code: "08006" } } };
    expect(isDatabaseUnavailableError(error)).toBe(true);
  });
});
