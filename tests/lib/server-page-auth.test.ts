import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
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
  };
});

vi.mock("@/app/db/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/lib/authorization", () => ({
  hasScopeAccess: vi.fn(() => true),
}));

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { verifyAccessJWT } from "@/app/lib/jwt";
import { assertActiveAuthorityFromPayload } from "@/app/lib/active-authority";
import { resolveModuleAccessForUser } from "@/app/lib/module-access";
import { db } from "@/app/db/client";
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
    (cookies as any).mockResolvedValue({
      get: (name: string) =>
        name === "access_token"
          ? {
              name,
              value: "token-1",
            }
          : undefined,
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
        adminCanAccessReports: false,
      },
      workflowAssignments: [],
      canAccessDossier: false,
      canAccessReports: false,
      canAccessBulkUpload: false,
      canAccessAcademicsBulk: false,
      canAccessPtBulk: false,
      sections: {
        dashboard: true,
        admin: true,
        settings: true,
        dossier: false,
        bulk_upload: false,
        reports: false,
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
  });

  it("redirects ADMIN away from a disabled reports page", async () => {
    await expect(requireDashboardModuleAccess("REPORTS")).rejects.toThrow("REDIRECT:/dashboard");
    expect(redirect).toHaveBeenCalledWith("/dashboard");
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
