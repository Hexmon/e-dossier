// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { PasswordField } from "@/components/reports/common/PasswordField";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("PasswordField", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it("toggles password visibility with the eye button", () => {
    act(() => {
      root.render(<PasswordField value="report-pass" onChange={vi.fn()} />);
    });

    const input = container.querySelector("input") as HTMLInputElement;
    const showButton = container.querySelector(
      'button[aria-label="Show password"]'
    ) as HTMLButtonElement;

    expect(input.type).toBe("password");
    expect(showButton.className).toContain("hover:text-primary");

    act(() => {
      showButton.click();
    });

    expect(input.type).toBe("text");
    expect(container.querySelector('button[aria-label="Hide password"]')).toBeTruthy();
  });
});
