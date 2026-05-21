import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/app/lib/setup-status", () => ({
  getSetupStatus: vi.fn(),
  isSetupStatusUnavailable: (status: any) => status.availability?.ok === false,
}));

vi.mock("@/app/lib/server-page-auth", () => ({
  getOptionalDashboardAccess: vi.fn(),
}));

import { redirect } from "next/navigation";
import { getSetupStatus } from "@/app/lib/setup-status";
import { getOptionalDashboardAccess } from "@/app/lib/server-page-auth";
import SetupPage from "@/app/setup/page";

describe("/setup page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders setup access guidance for non-admin users while setup is incomplete", async () => {
    (getSetupStatus as any).mockResolvedValueOnce({ setupComplete: false });
    (getOptionalDashboardAccess as any).mockResolvedValueOnce({
      roleGroup: "OTHER_USERS",
    });

    const element = await SetupPage();
    expect(element).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects non-admin authenticated users back to the dashboard after setup is complete", async () => {
    (getSetupStatus as any).mockResolvedValueOnce({ setupComplete: true });
    (getOptionalDashboardAccess as any).mockResolvedValueOnce({
      roleGroup: "OTHER_USERS",
    });

    await expect(SetupPage()).rejects.toThrow("REDIRECT:/dashboard");
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects authenticated admins away after setup is already complete", async () => {
    (getSetupStatus as any).mockResolvedValueOnce({ setupComplete: true });
    (getOptionalDashboardAccess as any).mockResolvedValueOnce({
      roleGroup: "ADMIN",
    });

    await expect(SetupPage()).rejects.toThrow("REDIRECT:/dashboard/genmgmt");
    expect(redirect).toHaveBeenCalledWith("/dashboard/genmgmt");
  });

  it("renders the setup client when setup is still in progress", async () => {
    (getSetupStatus as any).mockResolvedValueOnce({
      bootstrapRequired: true,
      setupComplete: false,
      nextStep: "superAdmin",
      counts: {
        activeSuperAdmins: 0,
        availableAppointmentPositions: 0,
        activeOperationalAppointments: 0,
        activePlatoons: 0,
        activeCourses: 0,
        activeOfferings: 0,
        activeOCs: 0,
        activeHierarchyNodes: 1,
        activeRootNodes: 1,
        missingPlatoonHierarchyNodes: 0,
      },
      steps: {
        superAdmin: { status: "pending", complete: false },
        platoons: { status: "blocked", complete: false },
        appointments: { status: "blocked", complete: false },
        hierarchy: { status: "blocked", complete: false },
        courses: { status: "blocked", complete: false },
        offerings: { status: "blocked", complete: false },
        ocs: { status: "blocked", complete: false },
      },
    });
    (getOptionalDashboardAccess as any).mockResolvedValueOnce(null);

    const element = await SetupPage();
    expect(element).toBeTruthy();
  });

  it("renders database unavailable UI instead of setup actions", async () => {
    (getSetupStatus as any).mockResolvedValueOnce({
      bootstrapRequired: false,
      setupComplete: false,
      nextStep: null,
      availability: {
        ok: false,
        code: "database_unavailable",
        message: "Database is temporarily unavailable. Please try again after the service is restored.",
        retryable: true,
      },
    });

    const html = renderToStaticMarkup(await SetupPage());

    expect(html).toContain("Database service unavailable");
    expect(html).toContain("PostgreSQL/Docker database service");
    expect(getOptionalDashboardAccess).not.toHaveBeenCalled();
  });
});
