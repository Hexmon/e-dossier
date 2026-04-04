import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/app/lib/http";

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

  it("allows admin bypass for locked semesters", async () => {
    await expect(
      ocChecks.assertOcSemesterWriteAllowed({
        ocId: "oc-1",
        requestedSemester: 1,
        authContext: { roles: ["ADMIN"], claims: {} },
      })
    ).resolves.toMatchObject({
      currentSemester: 3,
      requestedSemester: 1,
    });
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
