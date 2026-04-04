import { describe, expect, it } from "vitest";

import {
  buildDisplayAcademicRows,
  calculateAcademicRowState,
  resolveDisplayGrandTotal,
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

  it("does not render a practical component for legacy theory-only subjects even when stale practical flags exist", () => {
    const displayRows = buildDisplayAcademicRows([], [
      {
        offeringId: null,
        includeTheory: true,
        includePractical: true,
        theoryCredits: 4,
        practicalCredits: 1,
        subject: {
          id: "subject-2",
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
        theory: {
          totalMarks: 78,
        },
        practical: {
          totalMarks: 0,
          grade: "F",
        },
      },
    ] as any);

    expect(displayRows).toHaveLength(1);
    expect(displayRows[0]).toMatchObject({
      subjectCode: "MTH201",
      exam: "Theory",
      credit: 4,
      practicalExam: null,
      practicalCredit: null,
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

  it("uses shared theory and practical totals for row state calculations", () => {
    const rowState = calculateAcademicRowState({
      phase1: "10",
      phase2: "12",
      tutorial: "8",
      sessional: "",
      final: "40",
      practical: "",
      total: "",
      grade: "",
      practicalPhase1: "",
      practicalPhase2: "",
      practicalTutorial: "6",
      practicalSessional: "",
      practicalFinal: "25",
      practicalPractical: "",
      practicalTotal: "",
      practicalRemarks: "",
      practicalExam: "Practical",
      practicalCredit: 1,
      practicalGrade: "",
    } as any);

    expect(rowState).toMatchObject({
      sessional: "30",
      total: "70",
      practicalPractical: "25",
      practicalTotal: "25",
    });
  });

  it("derives grand total from shared totals without adding practical tutorial twice", () => {
    expect(
      resolveDisplayGrandTotal(
        [
          {
            phase1: "10",
            phase2: "10",
            tutorial: "5",
            sessional: "",
            final: "35",
            practical: "",
            total: "",
            grade: "",
            practicalPhase1: "",
            practicalPhase2: "",
            practicalTutorial: "9",
            practicalSessional: "",
            practicalFinal: "20",
            practicalPractical: "",
            practicalTotal: "",
            practicalRemarks: "",
            practicalExam: "Practical",
            practicalCredit: 1,
            practicalGrade: "",
          },
        ] as any,
        [
          {
            subjectId: "subject-1",
            subject: "Physics I",
            includeTheory: true,
            includePractical: true,
          },
        ]
      )
    ).toBe(80);
  });
});
