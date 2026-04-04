import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  orderByMock,
  selectMock,
  updateMock,
} = vi.hoisted(() => {
  const orderByMock = vi.fn();
  const whereMock = vi.fn(() => ({ orderBy: orderByMock }));
  const innerJoinMock = vi.fn(() => ({ where: whereMock }));
  const fromMock = vi.fn(() => ({ innerJoin: innerJoinMock }));
  const selectMock = vi.fn(() => ({ from: fromMock }));
  const updateWhereMock = vi.fn();
  const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
  const updateMock = vi.fn(() => ({ set: updateSetMock }));

  return {
    orderByMock,
    selectMock,
    updateMock,
  };
});

vi.mock("@/app/db/client", () => ({
  db: {
    select: selectMock,
    update: updateMock,
  },
}));

vi.mock("@/app/db/queries/academicGradingPolicy", () => ({
  getAcademicGradingPolicy: vi.fn(),
}));

import {
  DEFAULT_ACADEMIC_GRADING_POLICY,
  marksToGradePointsWithPolicy,
  marksToLetterGradeWithPolicy,
} from "@/app/lib/grading-policy";
import { buildAcademicSemesterView } from "@/app/lib/semester-marks";
import { getAcademicGradingPolicy } from "@/app/db/queries/academicGradingPolicy";
import { recalculateAcademicGrading } from "@/app/services/academic-grading-recalculate";

describe("zero-credit academics grading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderByMock.mockResolvedValue([]);
    vi.mocked(getAcademicGradingPolicy).mockResolvedValue({
      ...DEFAULT_ACADEMIC_GRADING_POLICY,
      sgpaFormulaTemplate: "SEMESTER_AVG",
      cgpaFormulaTemplate: "SEMESTER_AVG",
    });
  });

  it("hides theory and practical grades in the semester view when credits are zero", () => {
    const result = buildAcademicSemesterView({
      semester: 1,
      branchTag: "C",
      row: {
        semester: 1,
        branchTag: "C",
        sgpa: null,
        cgpa: null,
        marksScored: null,
        subjects: [
          {
            subjectCode: "SUB-1",
            subjectName: "Zero Credit Subject",
            branch: "C",
            theory: {
              finalMarks: 72,
              grade: "A",
            },
            practical: {
              finalMarks: 40,
              grade: "P",
            },
            meta: {
              subjectId: "subject-1",
              offeringId: "off-1",
              theoryCredits: 0,
              practicalCredits: 0,
            },
          },
        ],
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-02T00:00:00Z"),
      } as any,
      offerings: [
        {
          id: "off-1",
          semester: 1,
          includeTheory: true,
          includePractical: true,
          theoryCredits: 0,
          practicalCredits: 0,
          subject: {
            id: "subject-1",
            code: "SUB-1",
            name: "Zero Credit Subject",
            branch: "C",
            hasTheory: true,
            hasPractical: true,
            defaultTheoryCredits: 0,
            defaultPracticalCredits: 0,
            description: null,
            createdAt: new Date("2026-01-01T00:00:00Z"),
            updatedAt: new Date("2026-01-02T00:00:00Z"),
            deletedAt: null,
          },
        },
      ] as any,
    });

    expect(result.subjects[0]?.theory?.grade).toBeUndefined();
    expect(result.subjects[0]?.practical?.grade).toBeUndefined();
  });

  it("clears zero-credit grades during grading recalculation and skips them in semester averages", async () => {
    const policy = {
      ...DEFAULT_ACADEMIC_GRADING_POLICY,
      sgpaFormulaTemplate: "SEMESTER_AVG" as const,
      cgpaFormulaTemplate: "SEMESTER_AVG" as const,
    };

    vi.mocked(getAcademicGradingPolicy).mockResolvedValue(policy);

    orderByMock.mockResolvedValue([
      {
        id: "row-1",
        ocId: "oc-1",
        semester: 1,
        courseId: "course-1",
        sgpa: 0,
        cgpa: 0,
        subjects: [
          {
            subjectCode: "ZERO101",
            subjectName: "Zero Credit Subject",
            branch: "C",
            theory: {
              finalMarks: 10,
              grade: "F",
            },
            meta: {
              theoryCredits: 0,
            },
          },
          {
            subjectCode: "CRED101",
            subjectName: "Credited Subject",
            branch: "C",
            theory: {
              finalMarks: 80,
              grade: marksToLetterGradeWithPolicy(80, policy),
            },
            meta: {
              theoryCredits: 3,
            },
          },
        ],
      },
    ]);

    const result = await recalculateAcademicGrading({
      dryRun: true,
      scope: "all",
    });

    expect(result.changedRows).toBe(1);
    expect(result.changedGradeFields).toBe(1);
    expect(result.changedSummaryRows).toBe(1);
    expect(result.sampleChanges).toContainEqual({
      ocId: "oc-1",
      courseId: "course-1",
      semester: 1,
      field: "sgpa",
      before: 0,
      after: marksToGradePointsWithPolicy(80, policy),
    });
    expect(updateMock).not.toHaveBeenCalled();
  });
});
