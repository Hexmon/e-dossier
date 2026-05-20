import { describe, expect, it } from "vitest";

import { hydrateAcademicViewsWithSubjectCatalog } from "@/app/services/oc-academics";
import { isAcademicSubjectEligibleForOc } from "@/app/lib/academic-marks-core";

describe("hydrateAcademicViewsWithSubjectCatalog", () => {
  it("allows common subjects in early terms and OC branch subjects from term three", () => {
    expect(isAcademicSubjectEligibleForOc(1, "M", "C")).toBe(true);
    expect(isAcademicSubjectEligibleForOc(1, "M", "M")).toBe(false);
    expect(isAcademicSubjectEligibleForOc(3, "M", "C")).toBe(true);
    expect(isAcademicSubjectEligibleForOc(3, "M", "M")).toBe(true);
    expect(isAcademicSubjectEligibleForOc(3, "M", "E")).toBe(false);
  });

  it("fills legacy subject credits and ids from the subject catalog", () => {
    const result = hydrateAcademicViewsWithSubjectCatalog(
      [
        {
          semester: 1,
          branchTag: "C",
          sgpa: null,
          cgpa: null,
          marksScored: null,
          subjects: [
            {
              offeringId: null,
              includeTheory: true,
              includePractical: false,
              theoryCredits: null,
              practicalCredits: null,
              subject: {
                id: null,
                code: "PHY101",
                name: "Physics I",
                branch: "C",
                hasTheory: true,
                hasPractical: false,
                defaultTheoryCredits: null,
                defaultPracticalCredits: null,
                description: null,
                createdAt: null,
                updatedAt: null,
                deletedAt: null,
              },
              theory: {
                finalMarks: 72,
                totalMarks: 72,
                sessionalMarks: 0,
              },
            },
          ],
          createdAt: new Date("2024-01-01T00:00:00Z").toISOString(),
          updatedAt: new Date("2024-01-01T00:00:00Z").toISOString(),
        },
      ],
      [
        {
          id: "subject-1",
          code: "PHY101",
          name: "Physics I",
          branch: "C",
          hasTheory: true,
          hasPractical: false,
          defaultTheoryCredits: 4,
          defaultPracticalCredits: null,
          description: "Physics fundamentals",
          createdAt: new Date("2024-01-01T00:00:00Z"),
          updatedAt: new Date("2024-01-02T00:00:00Z"),
          deletedAt: null,
        },
      ]
    );

    expect(result[0]?.subjects[0]).toMatchObject({
      theoryCredits: 4,
      subject: {
        id: "subject-1",
        defaultTheoryCredits: 4,
        description: "Physics fundamentals",
      },
    });
  });

  it("removes stale practical state when the subject catalog says a legacy subject is theory-only", () => {
    const result = hydrateAcademicViewsWithSubjectCatalog(
      [
        {
          semester: 1,
          branchTag: "C",
          sgpa: null,
          cgpa: null,
          marksScored: null,
          subjects: [
            {
              offeringId: null,
              includeTheory: true,
              includePractical: true,
              theoryCredits: 4,
              practicalCredits: 1,
              subject: {
                id: null,
                code: "MTH201",
                name: "Engineering Mathematics",
                branch: "C",
                hasTheory: true,
                hasPractical: true,
                defaultTheoryCredits: 4,
                defaultPracticalCredits: 1,
                description: null,
                createdAt: null,
                updatedAt: null,
                deletedAt: null,
              },
              theory: {
                finalMarks: 70,
                totalMarks: 70,
                sessionalMarks: 0,
              },
              practical: {
                finalMarks: 0,
                totalMarks: 0,
                grade: "F",
              },
            },
          ],
          createdAt: new Date("2024-01-01T00:00:00Z").toISOString(),
          updatedAt: new Date("2024-01-01T00:00:00Z").toISOString(),
        },
      ],
      [
        {
          id: "subject-2",
          code: "MTH201",
          name: "Engineering Mathematics",
          branch: "C",
          hasTheory: true,
          hasPractical: false,
          defaultTheoryCredits: 4,
          defaultPracticalCredits: null,
          description: "Theory only",
          createdAt: new Date("2024-01-01T00:00:00Z"),
          updatedAt: new Date("2024-01-02T00:00:00Z"),
          deletedAt: null,
        },
      ]
    );

    expect(result[0]?.subjects[0]).toMatchObject({
      includeTheory: true,
      includePractical: false,
      practicalCredits: null,
      subject: {
        id: "subject-2",
        hasPractical: false,
      },
    });
    expect(result[0]?.subjects[0]?.practical).toBeUndefined();
  });
});
