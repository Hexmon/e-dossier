import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import SemesterLockNotice from "@/components/dossier/SemesterLockNotice";
import { useMe } from "@/hooks/useMe";

vi.mock("@/hooks/useMe", () => ({
  useMe: vi.fn(),
}));

describe("SemesterLockNotice", () => {
  beforeEach(() => {
    vi.mocked(useMe).mockReturnValue({
      data: {
        dossierForms: {
          lockPolicy: "DEFAULT",
        },
      },
    } as any);
  });

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

  it("renders a global freeze message when freeze-all is enabled", () => {
    vi.mocked(useMe).mockReturnValue({
      data: {
        dossierForms: {
          lockPolicy: "FREEZE_ALL",
        },
      },
    } as any);

    const html = renderToStaticMarkup(
      <SemesterLockNotice activeSemester={3} currentSemester={3} />
    );

    expect(html).toContain("global freeze");
  });

  it("renders nothing when unfreeze-all is enabled", () => {
    vi.mocked(useMe).mockReturnValue({
      data: {
        dossierForms: {
          lockPolicy: "UNFREEZE_ALL",
        },
      },
    } as any);

    expect(
      renderToStaticMarkup(
        <SemesterLockNotice activeSemester={1} currentSemester={3} />
      )
    ).toBe("");
  });
});
