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

  it("keeps ADMIN on admin, settings, reports, home, and help only", async () => {
    const access = await resolveModuleAccessForUser({
      userId: "admin-1",
      roles: ["ADMIN"],
      position: "ADMIN",
    });

    expect(access.canAccessDossier).toBe(false);
    expect(access.canAccessBulkUpload).toBe(false);
    expect(access.canAccessReports).toBe(true);
    expect(access.sections.admin).toBe(true);
    expect(access.sections.settings).toBe(true);
    expect(access.sections.dossier).toBe(false);
    expect(access.sections.bulk_upload).toBe(false);
    expect(access.sections.reports).toBe(true);
  });

  it("does not add Bulk Upload to ADMIN even when explicitly assigned to a workflow", async () => {
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

    expect(access.canAccessBulkUpload).toBe(false);
    expect(access.canAccessAcademicsBulk).toBe(false);
    expect(access.canAccessPtBulk).toBe(false);
    expect(access.sections.bulk_upload).toBe(false);
  });

  it("keeps platoon commanders on dossier, reports, home, and help only", async () => {
    const access = await resolveModuleAccessForUser({
      userId: "user-1",
      roles: ["PLATOON_COMMANDER"],
      position: "PLATOON_COMMANDER",
    });

    expect(access.canAccessDossier).toBe(true);
    expect(access.canAccessBulkUpload).toBe(false);
    expect(access.canAccessReports).toBe(true);
    expect(access.sections.admin).toBe(false);
    expect(access.sections.settings).toBe(false);
    expect(access.sections.dossier).toBe(true);
    expect(access.sections.bulk_upload).toBe(false);
  });

  it("keeps other users on bulk upload, reports, home, and help only", async () => {
    const access = await resolveModuleAccessForUser({
      userId: "user-1",
      roles: ["guest"],
      position: "HOAT",
    });

    expect(access.canAccessDossier).toBe(false);
    expect(access.canAccessBulkUpload).toBe(true);
    expect(access.canAccessReports).toBe(true);
    expect(access.sections.admin).toBe(false);
    expect(access.sections.settings).toBe(false);
    expect(access.sections.dossier).toBe(false);
    expect(access.sections.bulk_upload).toBe(true);
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

  it("allows ADMIN report access", async () => {
    await expect(
      assertModuleApiAccessByPath("/api/v1/reports/metadata/course-semesters", {
        userId: "admin-1",
        roles: ["ADMIN"],
        position: "ADMIN",
      })
    ).resolves.toBeUndefined();
  });

  it("blocks ADMIN bulk APIs even when assigned to a workflow", async () => {
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
    ).rejects.toMatchObject<ApiError>({
      status: 403,
      code: "module_access_denied",
    });
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

  it("blocks platoon commanders from bulk APIs but allows dossier APIs", async () => {
    await expect(
      assertModuleApiAccessByPath("/api/v1/oc/physical-training/bulk", {
        userId: "platoon-1",
        roles: ["PLATOON_COMMANDER"],
        position: "PLATOON_COMMANDER",
      })
    ).rejects.toMatchObject<ApiError>({
      status: 403,
      code: "module_access_denied",
    });

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

  it("blocks other users from dossier APIs but allows bulk APIs", async () => {
    await expect(
      assertModuleApiAccessByPath("/api/v1/oc/physical-training/bulk", {
        userId: "user-1",
        roles: ["guest"],
        position: "HOAT",
      })
    ).resolves.toBeUndefined();

    await expect(
      assertModuleApiAccessByPath(
        "/api/v1/oc/11111111-1111-4111-8111-111111111111/dossier-snapshot",
        {
          userId: "user-1",
          roles: ["guest"],
          position: "HOAT",
        }
      )
    ).rejects.toMatchObject<ApiError>({
      status: 403,
      code: "module_access_denied",
    });
  });

  it("keeps SUPER_ADMIN unrestricted", async () => {
    await expect(
      assertModuleApiAccessByPath("/api/v1/reports/metadata/course-semesters", {
        userId: "super-1",
        roles: ["SUPER_ADMIN"],
        position: "SUPER_ADMIN",
      })
    ).resolves.toBeUndefined();

    await expect(
      assertModuleApiAccessByPath("/api/v1/oc/physical-training/bulk", {
        userId: "super-1",
        roles: ["SUPER_ADMIN"],
        position: "SUPER_ADMIN",
      })
    ).resolves.toBeUndefined();
  });
});
