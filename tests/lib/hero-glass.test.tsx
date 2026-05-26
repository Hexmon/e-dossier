// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";

import Hero from "@/components/Hero";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe("Hero", () => {
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
  });

  it("renders the landing title content inside a translucent glass panel", async () => {
    await act(async () => {
      root.render(<Hero title="MCEME" description="Training Excellence" />);
    });

    const title = container.querySelector("h1");
    const panel = title?.parentElement;

    expect(title?.textContent).toBe("MCEME");
    expect(panel?.className).toContain("bg-primary/5");
    expect(panel?.className).toContain("backdrop-blur-xs");
    expect(panel?.className).toContain("border-primary-foreground/30");
    expect(panel?.className).toContain("rounded-lg");
    expect(panel?.textContent).toContain("Training Excellence");
  });
});
