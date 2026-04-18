import {
  resolveAcademicPracticalCredits,
  resolveAcademicTheoryCredits,
  resolvePracticalTotalMarks,
  resolveTheoryTotalMarks,
} from '@/app/lib/academic-marks-core';
import type { AcademicSubjectView } from '@/app/lib/semester-marks';

export type AcademicPerformanceMarksSummary = {
  rawScored: number;
  rawMax: number;
  weightedScored: number;
  weightedMax: number;
  totalCredits: number;
  scaled: number;
};

function trunc1(value: number) {
  return Math.trunc((value + Number.EPSILON) * 10) / 10;
}

function clampNonNegative(value: number | null | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, numeric);
}

export function scaleAcademicPerformanceSummary(
  summary: Pick<AcademicPerformanceMarksSummary, 'weightedScored' | 'weightedMax'>,
  targetMax: number,
) {
  const normalizedTargetMax = Number(targetMax);
  if (!Number.isFinite(normalizedTargetMax) || normalizedTargetMax <= 0) return 0;

  const scaledRaw =
    summary.weightedMax > 0 ? (summary.weightedScored / summary.weightedMax) * normalizedTargetMax : 0;

  return trunc1(Math.max(0, Math.min(normalizedTargetMax, scaledRaw)));
}

export function summarizeAcademicPerformanceMarks(
  subjects: AcademicSubjectView[] | null | undefined,
): AcademicPerformanceMarksSummary {
  let rawScored = 0;
  let rawMax = 0;
  let weightedScored = 0;
  let totalCredits = 0;

  for (const subject of subjects ?? []) {
    if (subject.includeTheory) {
      const theoryMarks = clampNonNegative(resolveTheoryTotalMarks(subject.theory));
      const theoryCredits = resolveAcademicTheoryCredits(subject);
      rawScored += theoryMarks;
      rawMax += 100;
      weightedScored += theoryMarks * theoryCredits;
      totalCredits += theoryCredits;
    }

    if (subject.includePractical) {
      const practicalMarks = clampNonNegative(resolvePracticalTotalMarks(subject.practical));
      const practicalCredits = resolveAcademicPracticalCredits(subject);
      rawScored += practicalMarks;
      rawMax += 100;
      weightedScored += practicalMarks * practicalCredits;
      totalCredits += practicalCredits;
    }
  }

  const weightedMax = totalCredits * 100;

  return {
    rawScored,
    rawMax,
    weightedScored,
    weightedMax,
    totalCredits,
    scaled: scaleAcademicPerformanceSummary(
      {
        weightedScored,
        weightedMax,
      },
      1350,
    ),
  };
}
