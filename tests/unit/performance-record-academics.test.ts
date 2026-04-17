import { describe, expect, it } from 'vitest';

import { summarizeAcademicPerformanceMarks } from '@/app/lib/performance-record-academics';
import type { AcademicSubjectView } from '@/app/lib/semester-marks';

function makeSubject(input: {
  includeTheory?: boolean;
  includePractical?: boolean;
  theoryCredits?: number | null;
  practicalCredits?: number | null;
  theoryTotal?: number | null;
  practicalTotal?: number | null;
}): AcademicSubjectView {
  return {
    includeTheory: input.includeTheory ?? false,
    includePractical: input.includePractical ?? false,
    theoryCredits: input.theoryCredits ?? null,
    practicalCredits: input.practicalCredits ?? null,
    subject: {
      id: 'subject-id',
      code: 'SUBJ',
      name: 'Subject',
      branch: 'C',
      hasTheory: input.includeTheory ?? false,
      hasPractical: input.includePractical ?? false,
      defaultTheoryCredits: null,
      defaultPracticalCredits: null,
    },
    theory: input.includeTheory
      ? {
          totalMarks: input.theoryTotal ?? 0,
          sessionalMarks: 0,
          finalMarks: input.theoryTotal ?? 0,
        }
      : undefined,
    practical: input.includePractical
      ? {
          totalMarks: input.practicalTotal ?? 0,
          finalMarks: input.practicalTotal ?? 0,
        }
      : undefined,
  };
}

describe('performance record academics scaling', () => {
  it('uses credit-weighted theory and practical marks when scaling to 1350', () => {
    const result = summarizeAcademicPerformanceMarks([
      makeSubject({
        includeTheory: true,
        includePractical: true,
        theoryCredits: 4,
        practicalCredits: 2,
        theoryTotal: 80,
        practicalTotal: 50,
      }),
      makeSubject({
        includeTheory: true,
        theoryCredits: 13,
        theoryTotal: 0,
      }),
    ]);

    expect(result.rawScored).toBe(130);
    expect(result.rawMax).toBe(300);
    expect(result.weightedScored).toBe(420);
    expect(result.totalCredits).toBe(19);
    expect(result.weightedMax).toBe(1900);
    expect(result.scaled).toBe(298.4);
  });

  it('ignores zero-credit components in the weighted denominator', () => {
    const result = summarizeAcademicPerformanceMarks([
      makeSubject({
        includeTheory: true,
        theoryCredits: 0,
        theoryTotal: 90,
      }),
      makeSubject({
        includePractical: true,
        practicalCredits: 2,
        practicalTotal: 50,
      }),
    ]);

    expect(result.rawScored).toBe(140);
    expect(result.rawMax).toBe(200);
    expect(result.weightedScored).toBe(100);
    expect(result.totalCredits).toBe(2);
    expect(result.weightedMax).toBe(200);
    expect(result.scaled).toBe(675);
  });
});
