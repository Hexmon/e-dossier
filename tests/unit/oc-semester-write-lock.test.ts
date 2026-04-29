import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/app/lib/http";
import { makeJsonRequest } from "../utils/next";
import { SEMESTER_OVERRIDE_REASON_HEADER } from "@/lib/semester-override";

vi.mock("@/app/lib/authz", () => ({
  requireAuth: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/authorization", () => ({
  authorizeOcAccess: vi.fn(),
}));

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

vi.mock("@/app/db/queries/oc-enrollments", () => ({
  getCurrentSemesterForOc: vi.fn(),
}));

vi.mock("@/app/db/queries/dossier-lock-settings", () => ({
  getDossierLockSettingsOrDefault: vi.fn(),
}));

const ocEnrollmentQueries = await import("@/app/db/queries/oc-enrollments");
const dossierLockQueries = await import("@/app/db/queries/dossier-lock-settings");
const ocChecks = await import("@/app/api/v1/oc/_checks");

describe("assertOcSemesterWriteAllowed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ocEnrollmentQueries.getCurrentSemesterForOc).mockResolvedValue(3);
    vi.mocked(dossierLockQueries.getDossierLockSettingsOrDefault).mockResolvedValue({
      id: "settings-1",
      singletonKey: "default",
      lockPolicy: "DEFAULT",
      updatedBy: null,
      createdAt: null,
      updatedAt: null,
    } as any);
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
        lockPolicy: "DEFAULT",
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
        lockPolicy: "DEFAULT",
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
        lockPolicy: "DEFAULT",
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
          lockPolicy: "DEFAULT",
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
        lockPolicy: "DEFAULT",
      },
    } satisfies Partial<ApiError>);
  });

  it("rejects all writes when the global freeze policy is enabled", async () => {
    vi.mocked(dossierLockQueries.getDossierLockSettingsOrDefault).mockResolvedValueOnce({
      id: "settings-1",
      singletonKey: "default",
      lockPolicy: "FREEZE_ALL",
      updatedBy: "super-1",
      createdAt: null,
      updatedAt: null,
    } as any);

    await expect(
      ocChecks.assertOcSemesterWriteAllowed({
        ocId: "oc-1",
        requestedSemester: 3,
        authContext: { roles: ["USER"], claims: {} },
      })
    ).rejects.toMatchObject({
      status: 403,
      code: "semester_locked",
      extras: expect.objectContaining({
        currentSemester: 3,
        requestedSemester: 3,
        lockPolicy: "FREEZE_ALL",
      }),
    } satisfies Partial<ApiError>);
  });

  it("allows non-current semester writes when the global unlock policy is enabled", async () => {
    vi.mocked(dossierLockQueries.getDossierLockSettingsOrDefault).mockResolvedValueOnce({
      id: "settings-1",
      singletonKey: "default",
      lockPolicy: "UNFREEZE_ALL",
      updatedBy: "super-1",
      createdAt: null,
      updatedAt: null,
    } as any);

    await expect(
      ocChecks.assertOcSemesterWriteAllowed({
        ocId: "oc-1",
        requestedSemester: 1,
        authContext: { roles: ["USER"], claims: {} },
      })
    ).resolves.toMatchObject({
      currentSemester: 3,
      requestedSemester: 1,
      lockPolicy: "UNFREEZE_ALL",
      overrideApplied: false,
    });
  });
});
