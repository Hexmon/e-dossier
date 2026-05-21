import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/setup-status", () => ({
  getSetupStatus: vi.fn(),
  isSetupStatusUnavailable: (status: any) => status.availability?.ok === false,
}));

vi.mock("@/app/lib/server-page-auth", () => ({
  getOptionalDashboardAccess: vi.fn(),
}));

vi.mock("@/components/Dashboard/DashboardHomePageClient", () => ({
  default: () => <div>dashboard home</div>,
}));

import DashboardPage from "@/app/dashboard/page";
import { getOptionalDashboardAccess } from "@/app/lib/server-page-auth";
import { getSetupStatus } from "@/app/lib/setup-status";

describe("/dashboard page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders database unavailable UI before resolving dashboard auth", async () => {
    (getSetupStatus as any).mockResolvedValueOnce({
      setupComplete: false,
      availability: {
        ok: false,
        code: "database_unavailable",
        message: "Database is temporarily unavailable. Please try again after the service is restored.",
        retryable: true,
      },
    });

    const html = renderToStaticMarkup(await DashboardPage());

    expect(html).toContain("Database service unavailable");
    expect(html).not.toContain("dashboard home");
    expect(getOptionalDashboardAccess).not.toHaveBeenCalled();
  });
});
