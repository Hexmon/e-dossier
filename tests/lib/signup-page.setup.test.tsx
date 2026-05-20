import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const signupState = vi.hoisted(() => ({
  replace: vi.fn(),
  useSetupStatus: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: signupState.replace,
  }),
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

vi.mock("@/hooks/useSetupStatus", () => ({
  useSetupStatus: signupState.useSetupStatus,
}));

vi.mock("@/app/lib/api/authApi", () => ({
  signupUser: vi.fn(),
  isStrongPassword: vi.fn(() => false),
  RESERVED_USERNAMES: [],
  checkUsernameAvailability: vi.fn(),
}));

import Signup from "@/app/(auth)/signup/page";

describe("signup page setup gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signupState.useSetupStatus.mockReturnValue({
      data: { setupComplete: true },
      isLoading: false,
      isFetching: false,
    });
  });

  it("hides the registration form while initial setup status is loading", () => {
    signupState.useSetupStatus.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isFetching: true,
    });

    const html = renderToStaticMarkup(<Signup />);

    expect(html).toContain("Checking setup status");
    expect(html).not.toContain("New User Registration");
  });

  it("hides the registration form while initial setup is incomplete", () => {
    signupState.useSetupStatus.mockReturnValueOnce({
      data: { setupComplete: false },
      isLoading: false,
      isFetching: false,
    });

    const html = renderToStaticMarkup(<Signup />);

    expect(html).toContain("Initial setup in progress");
    expect(html).toContain("Registration is available only after");
    expect(html).not.toContain("New User Registration");
  });

  it("shows the registration form after initial setup is complete", () => {
    const html = renderToStaticMarkup(<Signup />);

    expect(html).toContain("New User Registration");
    expect(html).toContain("Create Account");
  });
});
