import { describe, expect, it } from "vitest";
import { ApiError } from "@/app/lib/http";
import { resolveRelegationTransferSemesterPlan } from "@/app/db/queries/relegation";

describe("previous-semester relegation planning", () => {
  it("keeps normal course transfers as non-cleanup transfers", () => {
    expect(
      resolveRelegationTransferSemesterPlan({
        currentSemester: 4,
        relegationMode: "COURSE_TRANSFER",
      })
    ).toEqual({
      mode: "COURSE_TRANSFER",
      movementKind: "TRANSFER",
      fromSemester: 4,
      toSemester: null,
      cleanupFromSemester: null,
      newEnrollmentCurrentSemester: null,
    });
  });

  it("moves a semester 4 OC to semester 3 and marks semester 4+ for cleanup", () => {
    expect(
      resolveRelegationTransferSemesterPlan({
        currentSemester: 4,
        relegationMode: "PREVIOUS_SEMESTER",
        targetSemester: 3,
      })
    ).toEqual({
      mode: "PREVIOUS_SEMESTER",
      movementKind: "SEMESTER_RELEGATION",
      fromSemester: 4,
      toSemester: 3,
      cleanupFromSemester: 4,
      newEnrollmentCurrentSemester: 3,
    });
  });

  it("rejects mismatched target semesters", () => {
    expect(() =>
      resolveRelegationTransferSemesterPlan({
        currentSemester: 4,
        relegationMode: "PREVIOUS_SEMESTER",
        targetSemester: 2,
      })
    ).toThrow(ApiError);
  });

  it("rejects previous-semester relegation from semester 1", () => {
    expect(() =>
      resolveRelegationTransferSemesterPlan({
        currentSemester: 1,
        relegationMode: "PREVIOUS_SEMESTER",
        targetSemester: 1,
      })
    ).toThrow(ApiError);
  });
});
