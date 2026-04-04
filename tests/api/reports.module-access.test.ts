import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/app/lib/http";
import { GET } from "@/app/api/v1/reports/metadata/course-semesters/route";
import { makeJsonRequest } from "../utils/next";

vi.mock("@/app/lib/authz", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/app/lib/reports/semester-resolution", () => ({
  resolveCourseWithSemesters: vi.fn(),
}));

vi.mock("@/app/lib/acx/withAuthz", () => ({
  withAuthz: (handler: any) => handler,
}));

vi.mock("@/lib/audit", () => ({
  withAuditRoute: (_method: string, handler: any) => async (req: any, context: any) => {
    req.audit = { log: vi.fn(async () => undefined) };
    return handler(req, context);
  },
  AuditEventType: {
    API_REQUEST: "api.request",
  },
  AuditResourceType: {
    COURSE: "course",
  },
}));

import { requireAuth } from "@/app/lib/authz";
import { resolveCourseWithSemesters } from "@/app/lib/reports/semester-resolution";

describe("reports module access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue({
      userId: "user-1",
      roles: ["ADMIN"],
      claims: {},
    });
    (resolveCourseWithSemesters as any).mockResolvedValue({
      id: "course-1",
      code: "TES-50",
      title: "TES 50",
      currentSemester: 5,
      allowedSemesters: [1, 2, 3, 4, 5],
    });
  });

  it("returns 403 when module access blocks reports for ADMIN", async () => {
    (requireAuth as any).mockRejectedValueOnce(
      new ApiError(
        403,
        "REPORTS access is disabled for ADMIN by module access settings.",
        "module_access_denied"
      )
    );

    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/reports/metadata/course-semesters?courseId=11111111-1111-4111-8111-111111111111",
    });
    req.audit = { log: vi.fn(async () => undefined) };

    const res = await GET(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("module_access_denied");
  });

  it("returns course semester metadata when access is allowed", async () => {
    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/reports/metadata/course-semesters?courseId=11111111-1111-4111-8111-111111111111",
    });
    req.audit = { log: vi.fn(async () => undefined) };

    const res = await GET(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.currentSemester).toBe(5);
  });
});
