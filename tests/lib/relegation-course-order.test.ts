import { describe, expect, it } from "vitest";
import { isImmediateNextCourseCode, parseCourseSequence } from "@/app/db/queries/relegation";

describe("relegation course sequence helpers", () => {
  it("parses valid course codes", () => {
    expect(parseCourseSequence("TES-50")).toEqual({ prefix: "TES", number: 50 });
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
});
