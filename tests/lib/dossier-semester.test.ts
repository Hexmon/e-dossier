import { describe, expect, it } from "vitest";
import {
  buildSemesterSearchParams,
  isDossierSemesterLocked,
  resolveDossierSemester,
} from "@/lib/dossier-semester";

describe("resolveDossierSemester", () => {
  it("defaults to the current semester when the query is missing", () => {
    expect(
      resolveDossierSemester({
        requestedSemester: null,
        currentSemester: 3,
        supportedSemesters: [1, 2, 3, 4, 5, 6],
      })
    ).toMatchObject({
      activeSemester: 3,
      canonicalCurrentSemester: 3,
      currentSemester: 3,
      supportedSemesters: [1, 2, 3, 4, 5, 6],
    });
  });

  it("normalizes invalid query values back to the current semester", () => {
    expect(
      resolveDossierSemester({
        requestedSemester: "bad",
        currentSemester: 4,
        supportedSemesters: [1, 2, 3, 4, 5, 6],
      }).activeSemester
    ).toBe(4);
  });

  it("clamps late-term pages to their first supported semester", () => {
    expect(
      resolveDossierSemester({
        requestedSemester: null,
        currentSemester: 1,
        supportedSemesters: [4, 5, 6],
      })
    ).toMatchObject({
      activeSemester: 4,
      canonicalCurrentSemester: 4,
      supportedSemesters: [4, 5, 6],
    });
  });
});

describe("isDossierSemesterLocked", () => {
  it("locks past and future semesters for normal users", () => {
    expect(isDossierSemesterLocked({ semester: 2, currentSemester: 3 })).toBe(true);
    expect(isDossierSemesterLocked({ semester: 4, currentSemester: 3 })).toBe(true);
    expect(isDossierSemesterLocked({ semester: 3, currentSemester: 3 })).toBe(false);
  });

  it("allows admin/superadmin bypass callers to edit any semester", () => {
    expect(
      isDossierSemesterLocked({ semester: 1, currentSemester: 3, canBypassLock: true })
    ).toBe(false);
  });
});

describe("buildSemesterSearchParams", () => {
  it("rewrites legacy semester keys to the canonical semester param", () => {
    const params = buildSemesterSearchParams("tab=mil-trg&sem=2&semister=2", { semester: 5 });

    expect(params.get("semester")).toBe("5");
    expect(params.get("sem")).toBeNull();
    expect(params.get("semister")).toBeNull();
    expect(params.get("tab")).toBe("mil-trg");
  });
});
