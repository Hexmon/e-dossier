import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/app/lib/http";
import { makeJsonRequest } from "../utils/next";
import { SEMESTER_OVERRIDE_REASON_HEADER } from "@/lib/semester-override";

vi.mock("@/app/db/client", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([{ id: "oc-1" }]),
        })),
      })),
    })),
  },
}));

vi.mock("@/app/db/queries/oc", () => ({
  getOcCourseInfo: vi.fn(),
  getCurrentSemesterForCourse: vi.fn(),
}));

const ocQueries = await import("@/app/db/queries/oc");
const ocChecks = await import("@/app/api/v1/oc/_checks");

describe("assertOcSemesterWriteAllowed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ocQueries.getOcCourseInfo).mockResolvedValue({
      id: "oc-1",
      branch: "C",
      courseId: "course-1",
    } as any);
    vi.mocked(ocQueries.getCurrentSemesterForCourse).mockResolvedValue(3);
  });

  it("allows the current semester for normal users", async () => {
    await expect(
      ocChecks.assertOcSemesterWriteAllowed({
        ocId: "oc-1",
        requestedSemester: 3,
        authContext: { roles: ["USER"], claims: {} },
      })
    ).resolves.toMatchObject({
      currentSemester: 3,
      requestedSemester: 3,
      supportedSemesters: [1, 2, 3, 4, 5, 6],
    });
  });

  it("rejects stale semesters for normal users", async () => {
    await expect(
      ocChecks.assertOcSemesterWriteAllowed({
        ocId: "oc-1",
        requestedSemester: 1,
        authContext: { roles: ["USER"], claims: {} },
      })
    ).rejects.toMatchObject({
      status: 403,
      code: "semester_locked",
      extras: {
        currentSemester: 3,
        requestedSemester: 1,
        supportedSemesters: [1, 2, 3, 4, 5, 6],
      },
    } satisfies Partial<ApiError>);
  });

  it("rejects locked semesters for admins", async () => {
    await expect(
      ocChecks.assertOcSemesterWriteAllowed({
        ocId: "oc-1",
        requestedSemester: 1,
        authContext: { roles: ["ADMIN"], claims: {} },
      })
    ).rejects.toMatchObject({
      status: 403,
      code: "semester_locked",
      extras: {
        currentSemester: 3,
        requestedSemester: 1,
      },
    } satisfies Partial<ApiError>);
  });

  it("requires an override reason for super admin historical writes", async () => {
    await expect(
      ocChecks.assertOcSemesterWriteAllowed({
        ocId: "oc-1",
        requestedSemester: 1,
        authContext: { userId: "sa-1", roles: ["SUPER_ADMIN"], claims: {} },
        request: makeJsonRequest({
          method: "PATCH",
          path: "/api/v1/oc/oc-1/spr?semester=1",
        }) as any,
      })
    ).rejects.toMatchObject({
      status: 400,
      code: "override_reason_required",
      extras: {
        currentSemester: 3,
        requestedSemester: 1,
      },
    } satisfies Partial<ApiError>);
  });

  it("allows super admin historical writes when an override reason is supplied", async () => {
    const auditLog = vi.fn(async () => undefined);
    const req = makeJsonRequest({
      method: "PATCH",
      path: "/api/v1/oc/oc-1/spr?semester=1",
      headers: {
        [SEMESTER_OVERRIDE_REASON_HEADER]: "Historical correction",
      },
    }) as any;
    req.audit = { log: auditLog };

    await expect(
      ocChecks.assertOcSemesterWriteAllowed({
        ocId: "oc-1",
        requestedSemester: 1,
        authContext: { userId: "sa-1", roles: ["SUPER_ADMIN"], claims: {} },
        request: req,
      })
    ).resolves.toMatchObject({
      currentSemester: 3,
      requestedSemester: 1,
      overrideApplied: true,
      overrideReason: "Historical correction",
    });
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OC.SEMESTER_OVERRIDE",
        metadata: expect.objectContaining({
          requestedSemester: 1,
          currentSemester: 3,
          overrideReason: "Historical correction",
        }),
      })
    );
  });

  it("returns the route-specific supported semesters in the error payload", async () => {
    await expect(
      ocChecks.assertOcSemesterWriteAllowed({
        ocId: "oc-1",
        requestedSemester: 4,
        authContext: { roles: ["USER"], claims: {} },
        supportedSemesters: [4, 5, 6],
        currentSemester: 1,
      })
    ).rejects.toMatchObject({
      code: "semester_locked",
      extras: {
        currentSemester: 1,
        requestedSemester: 4,
        supportedSemesters: [4, 5, 6],
      },
    } satisfies Partial<ApiError>);
  });
});
