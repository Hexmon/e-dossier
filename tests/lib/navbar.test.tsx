import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

import Navbar from "@/components/Navbar";

describe("Navbar", () => {
  it("uses the bundled transparent ARTRAC PNG logo when no custom logo URL is configured", () => {
    const html = renderToStaticMarkup(<Navbar />);

    expect(html).toContain('src="/images/ARTRAC_NEW_LOGO.png"');
    expect(html).toContain('alt="Site Logo"');
    expect(html).toContain("MCEME");
    expect(html).toContain("CTW Portal");
  });

  it("uses a provided logo URL for the site logo", () => {
    const html = renderToStaticMarkup(
      <Navbar logoUrl="https://cdn.example.test/custom-logo.jpeg" />
    );

    expect(html).toContain('src="https://cdn.example.test/custom-logo.jpeg"');
  });
});
