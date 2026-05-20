import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("@/app/lib/jwt", () => ({
  verifyAccessJWT: vi.fn(),
}));

vi.mock("@/app/lib/active-authority", () => ({
  assertActiveAuthorityFromPayload: vi.fn(),
}));

vi.mock("@/app/lib/setup-status", () => ({
  getSetupStatus: vi.fn(),
  isSetupStatusUnavailable: (status: any) => status.availability?.ok === false,
}));

vi.mock("@/app/lib/module-access", () => {
  const resolveModuleAccessForUser = vi.fn();

  return {
    resolveModuleAccessForUser,
    hasResolvedSectionAccess: vi.fn((moduleAccess: any, sectionKey: string) => {
      return Boolean(moduleAccess?.sections?.[sectionKey]);
    }),
    canAccessModule: vi.fn((moduleAccess: any, moduleKey: string) => {
      if (moduleKey === "DOSSIER") return Boolean(moduleAccess?.canAccessDossier);
      if (moduleKey === "BULK_UPLOAD") return Boolean(moduleAccess?.canAccessBulkUpload);
      if (moduleKey === "REPORTS") return Boolean(moduleAccess?.canAccessReports);
      return false;
    }),
    canAccessBulkWorkflowModule: vi.fn((moduleAccess: any, workflowModule: string) => {
      if (workflowModule === "ACADEMICS_BULK") return Boolean(moduleAccess?.canAccessAcademicsBulk);
      if (workflowModule === "PT_BULK") return Boolean(moduleAccess?.canAccessPtBulk);
      return false;
    }),
    resolveSidebarSectionForDashboardPath: vi.fn((pathname: string) => {
      if (pathname === "/dashboard") return "dashboard";
      if (pathname.startsWith("/dashboard/help")) return "help";
      if (pathname.startsWith("/dashboard/genmgmt")) return "admin";
      if (pathname.startsWith("/dashboard/settings")) return "settings";
      if (pathname.startsWith("/dashboard/reports")) return "reports";
      if (
        pathname.startsWith("/dashboard/bulk-upload") ||
        pathname.startsWith("/dashboard/manage-marks") ||
        pathname.startsWith("/dashboard/manage-pt-marks")
      ) {
        return "bulk_upload";
      }
      if (/^\/dashboard\/[^/]+\/milmgmt(?:\/|$)/.test(pathname)) return "dossier";
      return null;
    }),
  };
});

vi.mock("@/app/db/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/app/db/queries/authz-permissions", () => ({
  getEffectivePermissionBundleCached: vi.fn(),
}));

vi.mock("@/lib/authorization", () => ({
  hasScopeAccess: vi.fn(() => true),
}));

import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { verifyAccessJWT } from "@/app/lib/jwt";
import { assertActiveAuthorityFromPayload } from "@/app/lib/active-authority";
import { getSetupStatus } from "@/app/lib/setup-status";
import { resolveModuleAccessForUser } from "@/app/lib/module-access";
import { db } from "@/app/db/client";
import { getEffectivePermissionBundleCached } from "@/app/db/queries/authz-permissions";
import { hasScopeAccess } from "@/lib/authorization";
import {
  requireDashboardAccess,
  requireDashboardBulkHubAccess,
  requireDashboardBulkWorkflowAccess,
  requireDashboardModuleAccess,
  requireDashboardOcModuleAccess,
  requirePlatoonCommanderDashboardAccess,
  requireSuperAdminDashboardAccess,
} from "@/app/lib/server-page-auth";

describe("server page auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTHZ_V2_ENABLED = "false";
    process.env.NEXT_PUBLIC_AUTHZ_V2_ENABLED = "false";
    (cookies as any).mockResolvedValue({
      get: (name: string) =>
        name === "access_token"
          ? {
              name,
              value: "token-1",
            }
          : undefined,
    });
    (headers as any).mockResolvedValue({
      get: () => null,
    });
    (getSetupStatus as any).mockResolvedValue({
      bootstrapRequired: false,
      setupComplete: true,
      nextStep: null,
    });
    (verifyAccessJWT as any).mockResolvedValue({
      sub: "admin-1",
      roles: ["ADMIN"],
      apt: {
        position: "ADMIN",
        scope: {
          type: "PLATOON",
          id: "platoon-1",
        },
      },
    });
    (assertActiveAuthorityFromPayload as any).mockResolvedValue(undefined);
    (resolveModuleAccessForUser as any).mockResolvedValue({
      roleGroup: "ADMIN",
      isAdmin: true,
      isSuperAdmin: false,
      settings: {
        adminCanAccessDossier: false,
        adminCanAccessBulkUpload: false,
        adminCanAccessReports: true,
      },
      workflowAssignments: [],
      canAccessDossier: false,
      canAccessReports: true,
      canAccessBulkUpload: false,
      canAccessAcademicsBulk: false,
      canAccessPtBulk: false,
      sections: {
        dashboard: true,
        admin: true,
        settings: true,
        dossier: false,
        bulk_upload: false,
        reports: true,
        help: true,
      },
    });
    (db.select as any).mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: "oc-1", platoonId: "platoon-1" }]),
        }),
      }),
    });
    (hasScopeAccess as any).mockReturnValue(true);
    (getEffectivePermissionBundleCached as any).mockResolvedValue({
      userId: "admin-1",
      roles: ["ADMIN"],
      appointment: {
        appointmentId: null,
        positionId: null,
        positionKey: "ADMIN",
        scopeType: "GLOBAL",
        scopeId: null,
      },
      isAdmin: true,
      isSuperAdmin: false,
      permissions: [],
      deniedPermissions: [],
      fieldRulesByAction: {},
      policyVersion: 2,
    });
  });

  it("allows ADMIN onto reports by default", async () => {
    const ctx = await requireDashboardModuleAccess("REPORTS");
    expect(ctx.moduleAccess.canAccessReports).toBe(true);
    expect(redirect).not.toHaveBeenCalledWith("/dashboard");
  });

  it("redirects dashboard access to setup while initial setup is incomplete", async () => {
    (getSetupStatus as any).mockResolvedValueOnce({
      bootstrapRequired: false,
      setupComplete: false,
      nextStep: "platoons",
    });
    (headers as any).mockResolvedValueOnce({
      get: (name: string) => (name === "x-pathname" ? "/dashboard/reports" : null),
    });

    await expect(requireDashboardAccess()).rejects.toThrow("REDIRECT:/setup");
    expect(redirect).toHaveBeenCalledWith("/setup");
  });

  it.each([
    "/dashboard",
    "/dashboard/genmgmt/promotion-relegation",
    "/dashboard/genmgmt/instructors",
    "/dashboard/genmgmt/report-verification",
    "/dashboard/reports",
    "/dashboard/settings",
    "/dashboard/oc-1/milmgmt",
    "/dashboard/help/software-overview",
    "/dashboard/help/general-management",
    "/dashboard/help/module-management",
    "/dashboard/help/dossier-management",
    "/dashboard/help/bulk-upload",
    "/dashboard/help/reports",
    "/dashboard/help/settings-controls",
    "/dashboard/help/rbac-permissions",
    "/dashboard/help/deployment-environment",
  ])("redirects edited URL access to %s while initial setup is incomplete", async (pathname) => {
    (getSetupStatus as any).mockResolvedValueOnce({
      bootstrapRequired: false,
      setupComplete: false,
      nextStep: "platoons",
    });
    (headers as any).mockResolvedValueOnce({
      get: (name: string) => (name === "x-pathname" ? pathname : null),
    });

    await expect(requireDashboardAccess()).rejects.toThrow("REDIRECT:/setup");
    expect(redirect).toHaveBeenCalledWith("/setup");
  });

  it("allows ADMIN setup task pages while initial setup is incomplete", async () => {
    (getSetupStatus as any).mockResolvedValueOnce({
      bootstrapRequired: false,
      setupComplete: false,
      nextStep: "courses",
    });
    (headers as any).mockResolvedValueOnce({
      get: (name: string) =>
        name === "x-pathname" ? "/dashboard/genmgmt/coursemgmt" : null,
    });

    const ctx = await requireDashboardAccess();
    expect(ctx.roleGroup).toBe("ADMIN");
  });

  it.each([
    "/dashboard/genmgmt/platoon-management",
    "/dashboard/genmgmt/usersmgmt",
    "/dashboard/genmgmt/appointmentmgmt",
    "/dashboard/genmgmt/hierarchy",
    "/dashboard/genmgmt/coursemgmt",
    "/dashboard/genmgmt/coursemgmt/course-1/offerings",
    "/dashboard/genmgmt/subjectmgmt",
    "/dashboard/genmgmt/ocmgmt",
    "/dashboard/help/setup-guide",
  ])("allows ADMIN setup URL %s while initial setup is incomplete", async (pathname) => {
    (getSetupStatus as any).mockResolvedValueOnce({
      bootstrapRequired: false,
      setupComplete: false,
      nextStep: "courses",
    });
    (headers as any).mockResolvedValueOnce({
      get: (name: string) => (name === "x-pathname" ? pathname : null),
    });

    const ctx = await requireDashboardAccess();
    expect(ctx.roleGroup).toBe("ADMIN");
    expect(redirect).not.toHaveBeenCalledWith("/setup");
  });

  it("redirects non-admin dashboard users to setup while initial setup is incomplete", async () => {
    (verifyAccessJWT as any).mockResolvedValueOnce({
      sub: "pl-cdr-1",
      roles: ["PLATOON_COMMANDER_EQUIVALENT"],
      apt: {
        position: "ARJUNPLCDR",
        scope: {
          type: "PLATOON",
          id: "platoon-1",
        },
      },
    });
    (resolveModuleAccessForUser as any).mockResolvedValueOnce({
      roleGroup: "OTHER_USERS",
      isAdmin: false,
      isSuperAdmin: false,
      settings: {
        adminCanAccessDossier: false,
        adminCanAccessBulkUpload: false,
        adminCanAccessReports: false,
      },
      workflowAssignments: [],
      canAccessDossier: true,
      canAccessReports: true,
      canAccessBulkUpload: true,
      canAccessAcademicsBulk: true,
      canAccessPtBulk: true,
      sections: {
        dashboard: true,
        admin: false,
        settings: true,
        dossier: true,
        bulk_upload: true,
        reports: true,
        help: true,
      },
    });
    (getSetupStatus as any).mockResolvedValueOnce({
      bootstrapRequired: false,
      setupComplete: false,
      nextStep: "courses",
    });
    (headers as any).mockResolvedValueOnce({
      get: (name: string) => (name === "x-pathname" ? "/dashboard" : null),
    });

    await expect(requireDashboardAccess()).rejects.toThrow("REDIRECT:/setup");
    expect(redirect).toHaveBeenCalledWith("/setup");
  });

  it("allows ADMIN onto reports when backend policy enables it", async () => {
    (resolveModuleAccessForUser as any).mockResolvedValueOnce({
      roleGroup: "ADMIN",
      isAdmin: true,
      isSuperAdmin: false,
      settings: {
        adminCanAccessDossier: false,
        adminCanAccessBulkUpload: false,
        adminCanAccessReports: true,
      },
      workflowAssignments: [],
      canAccessDossier: false,
      canAccessReports: true,
      canAccessBulkUpload: false,
      canAccessAcademicsBulk: false,
      canAccessPtBulk: false,
      sections: {
        dashboard: true,
        admin: true,
        settings: true,
        dossier: false,
        bulk_upload: false,
        reports: true,
        help: true,
      },
    });

    const ctx = await requireDashboardModuleAccess("REPORTS");
    expect(ctx.moduleAccess.canAccessReports).toBe(true);
  });

  it("allows dashboard pages under v2 when page permission and sidebar section both allow it", async () => {
    process.env.AUTHZ_V2_ENABLED = "true";
    process.env.NEXT_PUBLIC_AUTHZ_V2_ENABLED = "true";
    (headers as any).mockResolvedValueOnce({
      get: (name: string) => (name === "x-pathname" ? "/dashboard/reports" : null),
    });
    (getEffectivePermissionBundleCached as any).mockResolvedValueOnce({
      userId: "admin-1",
      roles: ["ADMIN"],
      appointment: {
        appointmentId: null,
        positionId: null,
        positionKey: "ADMIN",
        scopeType: "GLOBAL",
        scopeId: null,
      },
      isAdmin: true,
      isSuperAdmin: false,
      permissions: ["page:dashboard:reports:view"],
      deniedPermissions: [],
      fieldRulesByAction: {},
      policyVersion: 2,
    });

    const ctx = await requireDashboardModuleAccess("REPORTS");

    expect(ctx.permissions).toContain("page:dashboard:reports:view");
    expect(redirect).not.toHaveBeenCalledWith("/dashboard");
  });

  it("redirects dashboard pages under v2 when the resolved page permission is missing", async () => {
    process.env.AUTHZ_V2_ENABLED = "true";
    process.env.NEXT_PUBLIC_AUTHZ_V2_ENABLED = "true";
    (headers as any).mockResolvedValueOnce({
      get: (name: string) => (name === "x-pathname" ? "/dashboard/reports" : null),
    });

    await expect(requireDashboardAccess()).rejects.toThrow("REDIRECT:/dashboard");
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("fails closed under v2 when middleware did not provide the current pathname", async () => {
    process.env.AUTHZ_V2_ENABLED = "true";
    process.env.NEXT_PUBLIC_AUTHZ_V2_ENABLED = "false";
    (headers as any).mockResolvedValueOnce({
      get: () => null,
    });
    (getEffectivePermissionBundleCached as any).mockResolvedValueOnce({
      userId: "admin-1",
      roles: ["ADMIN"],
      appointment: {
        appointmentId: null,
        positionId: null,
        positionKey: "ADMIN",
        scopeType: "GLOBAL",
        scopeId: null,
      },
      isAdmin: true,
      isSuperAdmin: false,
      permissions: ["*"],
      deniedPermissions: [],
      fieldRulesByAction: {},
      policyVersion: 2,
    });

    await expect(requireDashboardAccess()).rejects.toThrow("REDIRECT:/dashboard");
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("fails closed under v2 for unmapped dashboard pages", async () => {
    process.env.AUTHZ_V2_ENABLED = "true";
    process.env.NEXT_PUBLIC_AUTHZ_V2_ENABLED = "false";
    (headers as any).mockResolvedValueOnce({
      get: (name: string) => (name === "x-pathname" ? "/dashboard/unmapped-page" : null),
    });
    (getEffectivePermissionBundleCached as any).mockResolvedValueOnce({
      userId: "admin-1",
      roles: ["ADMIN"],
      appointment: {
        appointmentId: null,
        positionId: null,
        positionKey: "ADMIN",
        scopeType: "GLOBAL",
        scopeId: null,
      },
      isAdmin: true,
      isSuperAdmin: false,
      permissions: ["*"],
      deniedPermissions: [],
      fieldRulesByAction: {},
      policyVersion: 2,
    });

    await expect(requireDashboardAccess()).rejects.toThrow("REDIRECT:/dashboard");
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("allows the bulk hub when ADMIN is explicitly assigned to a workflow", async () => {
    (resolveModuleAccessForUser as any).mockResolvedValueOnce({
      roleGroup: "ADMIN",
      isAdmin: true,
      isSuperAdmin: false,
      settings: {
        adminCanAccessDossier: false,
        adminCanAccessBulkUpload: false,
        adminCanAccessReports: false,
      },
      workflowAssignments: [{ module: "ACADEMICS_BULK", actorTypes: ["DATA_ENTRY"] }],
      canAccessDossier: false,
      canAccessReports: false,
      canAccessBulkUpload: true,
      canAccessAcademicsBulk: true,
      canAccessPtBulk: false,
      sections: {
        dashboard: true,
        admin: true,
        settings: true,
        dossier: false,
        bulk_upload: true,
        reports: false,
        help: true,
      },
    });

    const ctx = await requireDashboardBulkHubAccess();
    expect(ctx.moduleAccess.canAccessBulkUpload).toBe(true);
  });

  it("redirects when the specific bulk workflow page is disabled", async () => {
    await expect(requireDashboardBulkWorkflowAccess("ACADEMICS_BULK")).rejects.toThrow(
      "REDIRECT:/dashboard"
    );
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects non-super-admin users away from super-admin-only pages", async () => {
    await expect(requireSuperAdminDashboardAccess()).rejects.toThrow("REDIRECT:/dashboard");
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("allows scoped platoon commanders onto cadet appointment settings", async () => {
    (verifyAccessJWT as any).mockResolvedValueOnce({
      sub: "pl-cdr-1",
      roles: ["PLATOON_COMMANDER_EQUIVALENT"],
      apt: {
        position: "ARJUNPLCDR",
        scope: {
          type: "PLATOON",
          id: "platoon-1",
        },
      },
    });
    (resolveModuleAccessForUser as any).mockResolvedValueOnce({
      roleGroup: "OTHER_USERS",
      isAdmin: false,
      isSuperAdmin: false,
      settings: {
        adminCanAccessDossier: false,
        adminCanAccessBulkUpload: false,
        adminCanAccessReports: false,
      },
      workflowAssignments: [],
      canAccessDossier: true,
      canAccessReports: true,
      canAccessBulkUpload: true,
      canAccessAcademicsBulk: true,
      canAccessPtBulk: true,
      sections: {
        dashboard: true,
        admin: false,
        settings: true,
        dossier: true,
        bulk_upload: true,
        reports: true,
        help: true,
      },
    });

    const ctx = await requirePlatoonCommanderDashboardAccess();
    expect(ctx.scopeId).toBe("platoon-1");
  });

  it("allows scoped dynamic platoon-cdr identities onto cadet appointment settings", async () => {
    (verifyAccessJWT as any).mockResolvedValueOnce({
      sub: "pl-cdr-1",
      roles: ["chandragupt-platoon-cdr"],
      apt: {
        position: "chandragupt-platoon-cdr",
        scope: {
          type: "PLATOON",
          id: "platoon-1",
        },
      },
    });
    (resolveModuleAccessForUser as any).mockResolvedValueOnce({
      roleGroup: "OTHER_USERS",
      isAdmin: false,
      isSuperAdmin: false,
      settings: {
        adminCanAccessDossier: false,
        adminCanAccessBulkUpload: false,
        adminCanAccessReports: false,
      },
      workflowAssignments: [],
      canAccessDossier: true,
      canAccessReports: true,
      canAccessBulkUpload: true,
      canAccessAcademicsBulk: true,
      canAccessPtBulk: true,
      sections: {
        dashboard: true,
        admin: false,
        settings: true,
        dossier: true,
        bulk_upload: true,
        reports: true,
        help: true,
      },
    });

    const ctx = await requirePlatoonCommanderDashboardAccess();
    expect(ctx.scopeId).toBe("platoon-1");
  });

  it("redirects to login when the selected appointment is no longer active", async () => {
    (assertActiveAuthorityFromPayload as any).mockRejectedValueOnce(
      new Error("appointment inactive")
    );

    await expect(requireDashboardModuleAccess("REPORTS")).rejects.toThrow("REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to login when delegated authority is terminated", async () => {
    (verifyAccessJWT as any).mockResolvedValueOnce({
      sub: "delegate-1",
      roles: ["PLATOON_COMMANDER_EQUIVALENT"],
      apt: {
        id: "appointment-1",
        auth_kind: "DELEGATION",
        delegation_id: "delegation-1",
        position: "ARJUNPLCDR",
        scope: {
          type: "PLATOON",
          id: "platoon-1",
        },
      },
    });
    (assertActiveAuthorityFromPayload as any).mockRejectedValueOnce(
      new Error("delegation inactive")
    );

    await expect(requireDashboardAccess()).rejects.toThrow("REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("returns not found when the dossier page OC is archived or missing", async () => {
    (resolveModuleAccessForUser as any).mockResolvedValueOnce({
      roleGroup: "ADMIN",
      isAdmin: true,
      isSuperAdmin: false,
      settings: {
        adminCanAccessDossier: true,
        adminCanAccessBulkUpload: false,
        adminCanAccessReports: false,
      },
      workflowAssignments: [],
      canAccessDossier: true,
      canAccessReports: false,
      canAccessBulkUpload: false,
      canAccessAcademicsBulk: false,
      canAccessPtBulk: false,
      sections: {
        dashboard: true,
        admin: true,
        settings: true,
        dossier: true,
        bulk_upload: false,
        reports: false,
        help: true,
      },
    });
    (db.select as any).mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    });

    await expect(requireDashboardOcModuleAccess("oc-archived", "DOSSIER")).rejects.toThrow(
      "NOT_FOUND"
    );
    expect(notFound).toHaveBeenCalled();
  });

  it("redirects non-admin users away from foreign active OC pages", async () => {
    (verifyAccessJWT as any).mockResolvedValueOnce({
      sub: "user-1",
      roles: ["PLATOON_COMMANDER_EQUIVALENT"],
      apt: {
        position: "ARJUNPLCDR",
        scope: {
          type: "PLATOON",
          id: "platoon-1",
        },
      },
    });
    (resolveModuleAccessForUser as any).mockResolvedValueOnce({
      roleGroup: "OTHER_USERS",
      isAdmin: false,
      isSuperAdmin: false,
      settings: {
        adminCanAccessDossier: false,
        adminCanAccessBulkUpload: false,
        adminCanAccessReports: false,
      },
      workflowAssignments: [],
      canAccessDossier: true,
      canAccessReports: false,
      canAccessBulkUpload: false,
      canAccessAcademicsBulk: false,
      canAccessPtBulk: false,
      sections: {
        dashboard: true,
        admin: false,
        settings: false,
        dossier: true,
        bulk_upload: false,
        reports: false,
        help: true,
      },
    });
    (hasScopeAccess as any).mockReturnValueOnce(false);
    (db.select as any).mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: "oc-1", platoonId: "platoon-2" }]),
        }),
      }),
    });

    await expect(requireDashboardOcModuleAccess("oc-1", "DOSSIER")).rejects.toThrow(
      "REDIRECT:/dashboard"
    );
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });
});
