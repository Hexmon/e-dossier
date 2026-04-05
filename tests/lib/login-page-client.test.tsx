import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

import LoginPageClient from "@/components/auth/LoginPageClient";

describe("LoginPageClient", () => {
  it("shows the first-run setup CTA and accessible login controls when bootstrap is required", () => {
    const html = renderToStaticMarkup(
      <LoginPageClient bootstrapRequired />
    );

    expect(html).toContain("Initial setup required");
    expect(html).toContain('href="/setup"');
    expect(html).toContain('id="appointment-trigger"');
    expect(html).toContain('aria-describedby="login-password-help"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('autoComplete="username"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain("Enter the username for the selected appointment.");
    expect(html).not.toContain("Username is auto-filled from the appointment selection.");
  });

  it("renders the normal sign-in flow without the setup CTA once bootstrap is complete", () => {
    const html = renderToStaticMarkup(
      <LoginPageClient bootstrapRequired={false} />
    );

    expect(html).not.toContain("Initial setup required");
    expect(html).toContain("Sign in to MCEME CTW Portal");
  });
});
