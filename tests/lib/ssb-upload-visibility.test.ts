import { describe, expect, it } from "vitest";

import { parseSsbCourseDatesFromNotes } from "@/app/lib/ssb-upload-visibility";

describe("SSB upload visibility course dates", () => {
  it("uses Course Management start and end dates from course notes", () => {
    expect(parseSsbCourseDatesFromNotes("Start: 2025-11-15, End: 2026-06-21")).toEqual({
      courseStartDate: "2025-11-15",
      courseEndDate: "2026-06-21",
      defaultVisibleUntil: "2026-06-22",
    });
  });

  it("ignores malformed course dates", () => {
    expect(parseSsbCourseDatesFromNotes("Start: 2025-15-99, End: soon")).toEqual({
      courseStartDate: null,
      courseEndDate: null,
      defaultVisibleUntil: null,
    });
  });
});
