import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import SemesterLockNotice from "@/components/dossier/SemesterLockNotice";

describe("SemesterLockNotice", () => {
  it("renders nothing for the current semester", () => {
    expect(
      renderToStaticMarkup(
        <SemesterLockNotice activeSemester={3} currentSemester={3} />
      )
    ).toBe("");
  });

  it("renders a read-only message for non-super-admin users", () => {
    const html = renderToStaticMarkup(
      <SemesterLockNotice activeSemester={2} currentSemester={3} />
    );

    expect(html).toContain("Semester 2 is read-only");
  });

  it("renders an audited override warning for super admins", () => {
    const html = renderToStaticMarkup(
      <SemesterLockNotice
        activeSemester={1}
        currentSemester={5}
        canOverrideLockedSemester
      />
    );

    expect(html).toContain("override reason");
    expect(html).toContain("audited");
  });
});
