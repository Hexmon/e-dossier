import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/app/lib/http";

vi.mock("@/app/db/queries/module-access-settings", () => ({
  DEFAULT_MODULE_ACCESS_SETTINGS: {
    adminCanAccessDossier: false,
    adminCanAccessBulkUpload: false,
    adminCanAccessReports: false,
  },
  getModuleAccessSettingsOrDefault: vi.fn(),
}));

vi.mock("@/app/services/marksReviewWorkflow", () => ({
  listMarksWorkflowAssignmentsForUser: vi.fn(),
}));

import {
  assertModuleApiAccessByPath,
  resolveModuleAccessForUser,
  resolveModuleRequirementForApiPath,
} from "@/app/lib/module-access";
import { getModuleAccessSettingsOrDefault } from "@/app/db/queries/module-access-settings";
import { listMarksWorkflowAssignmentsForUser } from "@/app/services/marksReviewWorkflow";

describe("module access resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getModuleAccessSettingsOrDefault as any).mockResolvedValue({
      id: "settings-1",
      singletonKey: "default",
      adminCanAccessDossier: false,
      adminCanAccessBulkUpload: false,
      adminCanAccessReports: false,
      updatedBy: null,
      createdAt: null,
      updatedAt: null,
    });
    (listMarksWorkflowAssignmentsForUser as any).mockResolvedValue([]);
  });

  it("grants full access to SUPER_ADMIN", async () => {
    const access = await resolveModuleAccessForUser({
      userId: "super-1",
      roles: ["SUPER_ADMIN"],
      position: "SUPER_ADMIN",
    });

    expect(access.canAccessDossier).toBe(true);
    expect(access.canAccessBulkUpload).toBe(true);
    expect(access.canAccessReports).toBe(true);
    expect(access.sections.admin).toBe(true);
  });

  it("defaults ADMIN dossier, bulk, and reports access to false", async () => {
    const access = await resolveModuleAccessForUser({
      userId: "admin-1",
      roles: ["ADMIN"],
      position: "ADMIN",
    });

    expect(access.canAccessDossier).toBe(false);
    expect(access.canAccessBulkUpload).toBe(false);
    expect(access.canAccessReports).toBe(false);
    expect(access.sections.admin).toBe(true);
    expect(access.sections.dossier).toBe(false);
    expect(access.sections.bulk_upload).toBe(false);
    expect(access.sections.reports).toBe(false);
  });

  it("lets ADMIN reach the bulk hub when explicitly assigned to a workflow", async () => {
    (listMarksWorkflowAssignmentsForUser as any).mockResolvedValueOnce([
      {
        module: "ACADEMICS_BULK",
        actorTypes: ["DATA_ENTRY"],
      },
    ]);

    const access = await resolveModuleAccessForUser({
      userId: "admin-1",
      roles: ["ADMIN"],
      position: "ADMIN",
    });

    expect(access.canAccessBulkUpload).toBe(true);
    expect(access.canAccessAcademicsBulk).toBe(true);
    expect(access.canAccessPtBulk).toBe(false);
    expect(access.sections.bulk_upload).toBe(true);
  });

  it("keeps non-admin users on the existing dossier, bulk, and reports visibility", async () => {
    const access = await resolveModuleAccessForUser({
      userId: "user-1",
      roles: ["PLATOON_COMMANDER"],
      position: "PLATOON_COMMANDER",
    });

    expect(access.canAccessDossier).toBe(true);
    expect(access.canAccessBulkUpload).toBe(true);
    expect(access.canAccessReports).toBe(true);
    expect(access.sections.admin).toBe(false);
  });
});

describe("module API access enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getModuleAccessSettingsOrDefault as any).mockResolvedValue({
      id: "settings-1",
      singletonKey: "default",
      adminCanAccessDossier: false,
      adminCanAccessBulkUpload: false,
      adminCanAccessReports: false,
      updatedBy: null,
      createdAt: null,
      updatedAt: null,
    });
    (listMarksWorkflowAssignmentsForUser as any).mockResolvedValue([]);
  });

  it("classifies module-specific API paths correctly", () => {
    expect(resolveModuleRequirementForApiPath("/api/v1/reports/metadata/course-semesters")).toEqual({
      module: "REPORTS",
    });
    expect(resolveModuleRequirementForApiPath("/api/v1/oc/physical-training/bulk")).toEqual({
      module: "BULK_UPLOAD",
      workflowModule: "PT_BULK",
    });
    expect(
      resolveModuleRequirementForApiPath(
        "/api/v1/oc/11111111-1111-4111-8111-111111111111/dossier-snapshot"
      )
    ).toEqual({
      module: "DOSSIER",
    });
    expect(
      resolveModuleRequirementForApiPath("/api/v1/oc/11111111-1111-4111-8111-111111111111")
    ).toBeNull();
  });

  it("blocks ADMIN report access when reports is disabled", async () => {
    await expect(
      assertModuleApiAccessByPath("/api/v1/reports/metadata/course-semesters", {
        userId: "admin-1",
        roles: ["ADMIN"],
        position: "ADMIN",
      })
    ).rejects.toMatchObject<ApiError>({
      status: 403,
      code: "module_access_denied",
    });
  });

  it("allows an ADMIN workflow actor to reach the matching bulk API when bulk baseline is off", async () => {
    (listMarksWorkflowAssignmentsForUser as any).mockResolvedValueOnce([
      {
        module: "ACADEMICS_BULK",
        actorTypes: ["DATA_ENTRY"],
      },
    ]);

    await expect(
      assertModuleApiAccessByPath("/api/v1/oc/academics/bulk", {
        userId: "admin-1",
        roles: ["ADMIN"],
        position: "ADMIN",
      })
    ).resolves.toBeUndefined();
  });

  it("blocks ADMIN dossier child APIs when dossier access is disabled", async () => {
    await expect(
      assertModuleApiAccessByPath(
        "/api/v1/oc/11111111-1111-4111-8111-111111111111/dossier-snapshot",
        {
          userId: "admin-1",
          roles: ["ADMIN"],
          position: "ADMIN",
        }
      )
    ).rejects.toMatchObject<ApiError>({
      status: 403,
      code: "module_access_denied",
    });
  });

  it("keeps SUPER_ADMIN and non-admin callers unchanged", async () => {
    await expect(
      assertModuleApiAccessByPath("/api/v1/reports/metadata/course-semesters", {
        userId: "super-1",
        roles: ["SUPER_ADMIN"],
        position: "SUPER_ADMIN",
      })
    ).resolves.toBeUndefined();

    await expect(
      assertModuleApiAccessByPath(
        "/api/v1/oc/11111111-1111-4111-8111-111111111111/dossier-snapshot",
        {
          userId: "platoon-1",
          roles: ["PLATOON_COMMANDER"],
          position: "PLATOON_COMMANDER",
        }
      )
    ).resolves.toBeUndefined();
  });
});
