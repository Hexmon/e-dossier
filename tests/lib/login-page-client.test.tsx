import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mockSearchParams = vi.hoisted(() => ({
  current: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams.current,
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

import LoginPageClient from "@/components/auth/LoginPageClient";

describe("LoginPageClient", () => {
  beforeEach(() => {
    mockSearchParams.current = new URLSearchParams();
  });

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
    expect(html).toContain("Username is auto-filled from the selected appointment.");
    expect(html).not.toContain("Enter the username for the selected appointment.");
  });

  it("renders the normal sign-in flow without the setup CTA once bootstrap is complete", () => {
    const html = renderToStaticMarkup(
      <LoginPageClient bootstrapRequired={false} />
    );

    expect(html).not.toContain("Initial setup required");
    expect(html).toContain("Sign in to MCEME CTW Portal");
  });

  it("shows admin-only sign-in guidance while setup is incomplete", () => {
    const html = renderToStaticMarkup(
      <LoginPageClient bootstrapRequired={false} setupComplete={false} />
    );

    expect(html).toContain("Initial setup in progress");
    expect(html).toContain("Only ADMIN or SUPER_ADMIN sign-in is enabled");
    expect(html).not.toContain("Initial setup required");
  });

  it("ignores legacy role query params and still renders the normal sign-in flow", () => {
    mockSearchParams.current = new URLSearchParams("role=oc");

    const html = renderToStaticMarkup(
      <LoginPageClient bootstrapRequired={false} />
    );

    expect(html).toContain("Sign in to MCEME CTW Portal");
    expect(html).toContain('id="appointment-trigger"');
    expect(html).not.toContain("Coming Soon");
  });
});
