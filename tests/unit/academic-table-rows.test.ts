import { describe, expect, it } from "vitest";

import {
  buildDisplayAcademicRows,
  resolveDisplayTotalCredits,
  rowMatchesSemesterSubject,
} from "@/components/academics/AcademicTable";

describe("academicTableRows", () => {
  it("matches semester subjects by subject code when subject id differs", () => {
    expect(
      rowMatchesSemesterSubject(
        {
          subjectId: "",
          subjectCode: "phy101",
        },
        {
          subject: {
            id: "subject-1",
            code: "PHY101",
          },
        } as any
      )
    ).toBe(true);
  });

  it("appends legacy saved rows that are missing from current offerings", () => {
    const rows = [
      {
        subjectId: "subject-1",
        subjectCode: "PHY101",
        subject: "Physics I",
        exam: "Theory",
        credit: 3,
        practicalExam: "Practical",
        practicalCredit: 1,
        includeTheory: true,
        includePractical: true,
      },
    ];

    const displayRows = buildDisplayAcademicRows(rows, [
      {
        offeringId: "off-1",
        includeTheory: true,
        includePractical: true,
        theoryCredits: 3,
        practicalCredits: 1,
        subject: {
          id: "subject-1",
          code: "PHY101",
          name: "Physics I",
          branch: "C",
          hasTheory: true,
          hasPractical: true,
          defaultTheoryCredits: 3,
          defaultPracticalCredits: 1,
          description: null,
          createdAt: null,
          updatedAt: null,
          deletedAt: null,
        },
      },
      {
        offeringId: null,
        includeTheory: true,
        includePractical: false,
        theoryCredits: 4,
        practicalCredits: null,
        subject: {
          id: null,
          code: "MTH201",
          name: "Engineering Mathematics",
          branch: "C",
          hasTheory: true,
          hasPractical: false,
          defaultTheoryCredits: 4,
          defaultPracticalCredits: null,
          description: null,
          createdAt: null,
          updatedAt: null,
          deletedAt: null,
        },
      },
    ] as any);

    expect(displayRows).toHaveLength(2);
    expect(displayRows[1]).toMatchObject({
      subjectCode: "MTH201",
      subject: "Engineering Mathematics",
      credit: 4,
      includeTheory: true,
      includePractical: false,
      isLegacyRecord: true,
    });
  });

  it("derives total credits from merged display rows", () => {
    expect(
      resolveDisplayTotalCredits(
        [
          {
            subjectId: "subject-1",
            subjectCode: "PHY101",
            subject: "Physics I",
            credit: 3,
            practicalCredit: 1,
          },
          {
            subjectId: "",
            subjectCode: "MTH201",
            subject: "Engineering Mathematics",
            credit: 4,
            practicalCredit: null,
            isLegacyRecord: true,
          },
        ],
        0
      )
    ).toBe(8);
  });
});
