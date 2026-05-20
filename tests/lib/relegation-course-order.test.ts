import { describe, expect, it } from "vitest";
import {
  isImmediateNextCourseCode,
  parseCourseSequence,
  resolveImmediateNextCourseCode,
  selectCourseTransferTargetCourses,
  selectImmediateNextCourses,
  selectNearestNextCourses,
} from "@/app/db/queries/relegation";
import { normalizeCourseCode } from "@/app/lib/course-code";

describe("relegation course sequence helpers", () => {
  it("parses valid course codes", () => {
    expect(parseCourseSequence("TES-50")).toEqual({ prefix: "TES", number: 50 });
    expect(parseCourseSequence("TES=51")).toEqual({ prefix: "TES", number: 51 });
    expect(parseCourseSequence("abc123-7")).toEqual({ prefix: "ABC123", number: 7 });
  });

  it("returns null for invalid course codes", () => {
    expect(parseCourseSequence("TES50")).toBeNull();
    expect(parseCourseSequence("TES-" )).toBeNull();
    expect(parseCourseSequence("-50")).toBeNull();
  });

  it("detects immediate next course only", () => {
    expect(isImmediateNextCourseCode("TES-50", "TES-51")).toBe(true);
    expect(isImmediateNextCourseCode("TES-50", "TES-52")).toBe(false);
    expect(isImmediateNextCourseCode("TES-50", "EES-51")).toBe(false);
  });

  it("resolves the required immediate next course code", () => {
    expect(resolveImmediateNextCourseCode("TES-50")).toBe("TES-51");
  });

  it("normalizes sequence course codes before storage", () => {
    expect(normalizeCourseCode("tes=051")).toBe("TES-51");
    expect(normalizeCourseCode("TES-50")).toBe("TES-50");
    expect(normalizeCourseCode("SPECIAL")).toBe("SPECIAL");
  });

  it("selects the nearest higher available course when numbers are skipped", () => {
    expect(
      selectNearestNextCourses("TES-50", [
        { courseId: "c1", courseCode: "TES-54", courseName: "TES 54" },
        { courseId: "c2", courseCode: "TES-52", courseName: "TES 52" },
        { courseId: "c3", courseCode: "TES-53", courseName: "TES 53" },
      ])
    ).toEqual([{ courseId: "c2", courseCode: "TES-52", courseName: "TES 52" }]);
  });

  it("selects only the immediate next course for previous-semester relegation", () => {
    expect(
      selectImmediateNextCourses("TES-50", [
        { courseId: "c1", courseCode: "TES-49", courseName: "TES 49" },
        { courseId: "c2", courseCode: "TES=51", courseName: "TES 51" },
        { courseId: "c3", courseCode: "TES-52", courseName: "TES 52" },
        { courseId: "c4", courseCode: "EES-51", courseName: "EES 51" },
      ])
    ).toEqual([{ courseId: "c2", courseCode: "TES=51", courseName: "TES 51" }]);

    expect(
      selectImmediateNextCourses("TES-50", [
        { courseId: "c1", courseCode: "TES-52", courseName: "TES 52" },
        { courseId: "c3", courseCode: "TES-53", courseName: "TES 53" },
      ])
    ).toEqual([]);
  });

  it("keeps all active course-transfer targets except the current course", () => {
    expect(
      selectCourseTransferTargetCourses("c2", [
        { courseId: "c1", courseCode: "TES-49", courseName: "TES 49" },
        { courseId: "c2", courseCode: "TES-50", courseName: "TES 50" },
        { courseId: "c3", courseCode: "TES-51", courseName: "TES 51" },
      ])
    ).toEqual([
      { courseId: "c1", courseCode: "TES-49", courseName: "TES 49" },
      { courseId: "c3", courseCode: "TES-51", courseName: "TES 51" },
    ]);
  });
});
