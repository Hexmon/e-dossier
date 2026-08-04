import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("interview course template wiring", () => {
  it("passes the cadet course through both interview modules to the loader hook", () => {
    const page = readFileSync(
      "src/app/dashboard/[id]/milmgmt/interviews/page.tsx",
      "utf8",
    );
    const initial = readFileSync("src/components/interview/InterviewTabs.tsx", "utf8");
    const term = readFileSync(
      "src/components/interview-term/InterviewTermTabs.tsx",
      "utf8",
    );

    expect(page.match(/courseId=\{course\}/g)).toHaveLength(2);
    expect(initial).toContain("useInterviewForms(ocId, courseId)");
    expect(term).toContain("useInterviewForms(ocId, courseId)");
    expect(initial).toContain("[ocId, courseId]");
    expect(term).toContain("[ocId, courseId]");
  });
});
