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

  it("moves an excluded OC to the same semester in the next course and cleans only future data", () => {
    expect(
      resolveRelegationTransferSemesterPlan({
        currentSemester: 2,
        relegationMode: "REPEAT_SEMESTER",
        targetSemester: 2,
      })
    ).toEqual({
      mode: "REPEAT_SEMESTER",
      movementKind: "SEMESTER_REPEAT",
      fromSemester: 2,
      toSemester: 2,
      cleanupFromSemester: 3,
      newEnrollmentCurrentSemester: 2,
    });
  });

  it("rejects repeat-semester relegation when target is not the current semester", () => {
    expect(() =>
      resolveRelegationTransferSemesterPlan({
        currentSemester: 2,
        relegationMode: "REPEAT_SEMESTER",
        targetSemester: 1,
      })
    ).toThrow(ApiError);
  });
});
