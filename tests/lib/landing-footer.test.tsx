// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

import LandingFooter, { shouldDockFooter } from "@/components/LandingFooter";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("LandingFooter", () => {
  let container: HTMLDivElement;
  let root: Root;
  let wrapperTop = 1200;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    wrapperTop = 1200;

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    });

    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(80);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
      return {
        top: (this as HTMLElement).dataset.footerSlot === "landing" ? wrapperTop : 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: 0,
        height: 80,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it("calculates when the footer should return to its document slot", () => {
    expect(shouldDockFooter(900, 800, 80)).toBe(false);
    expect(shouldDockFooter(720, 800, 80)).toBe(true);
    expect(shouldDockFooter(600, 800, 80)).toBe(true);
  });

  it("pins the footer on landing view and docks it when its slot reaches the viewport", async () => {
    await act(async () => {
      root.render(<LandingFooter footer={"Landing footer text\nSecond line"} />);
    });

    const footer = container.querySelector("footer");
    const footerText = container.querySelector("p");
    expect(footer?.getAttribute("data-footer-state")).toBe("pinned");
    expect(footer?.className).toContain("fixed");
    expect(footer?.className).toContain("py-5");
    expect(footerText?.className).toContain("whitespace-pre-line");
    expect(footerText?.textContent).toBe("Landing footer text\nSecond line");

    wrapperTop = 700;
    await act(async () => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(footer?.getAttribute("data-footer-state")).toBe("docked");
    expect(footer?.className).toContain("relative");

    wrapperTop = 1000;
    await act(async () => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(footer?.getAttribute("data-footer-state")).toBe("pinned");
    expect(footer?.className).toContain("fixed");
  });
});
