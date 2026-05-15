import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/setup-status", () => ({
  getSetupStatus: vi.fn(),
  isSetupStatusUnavailable: (status: any) => status.availability?.ok === false,
}));

vi.mock("@/components/auth/LoginPageClient", () => ({
  default: () => <div>login form</div>,
}));

import LoginPage from "@/app/(auth)/login/page";
import { getSetupStatus } from "@/app/lib/setup-status";

describe("/login page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders database unavailable UI instead of the login form", async () => {
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

    const html = renderToStaticMarkup(await LoginPage());

    expect(html).toContain("Database service unavailable");
    expect(html).toContain("PostgreSQL/Docker database service");
    expect(html).not.toContain("login form");
  });
});
