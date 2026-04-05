import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { SetupResumeBanner } from "@/components/setup/SetupResumeBanner";

describe("SetupResumeBanner", () => {
  it("renders nothing when setup is already complete", () => {
    expect(
      renderToStaticMarkup(
        <SetupResumeBanner
          visible
          setupComplete
          nextStep={null}
        />
      )
    ).toBe("");
  });

  it("renders the next setup step from server-provided state", () => {
    const html = renderToStaticMarkup(
      <SetupResumeBanner
        visible
        setupComplete={false}
        nextStep="offerings"
      />
    );

    expect(html).toContain("Initial setup is still incomplete.");
    expect(html).toContain("Offerings / Semesters");
    expect(html).toContain('href="/setup"');
  });
});
