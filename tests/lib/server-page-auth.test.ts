import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/app/lib/jwt", () => ({
  verifyAccessJWT: vi.fn(),
}));

vi.mock("@/app/lib/module-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/lib/module-access")>();
  return {
    ...actual,
    resolveModuleAccessForUser: vi.fn(),
  };
});

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessJWT } from "@/app/lib/jwt";
import { resolveModuleAccessForUser } from "@/app/lib/module-access";
import {
  requireDashboardBulkHubAccess,
  requireDashboardBulkWorkflowAccess,
  requireDashboardModuleAccess,
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
      },
    });
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
});
