import type { TheoryMarksRecord } from '@/app/db/schema/training/oc';

export const MAX_PHASE_TEST_COUNT = 2;
export const DEFAULT_PHASE_TEST_COUNT = 2;
export const PHASE_TEST_MAX_MARKS = 20;
export const THEORY_TUTORIAL_MAX_MARKS = 10;
export const THEORY_FINAL_MAX_MARKS = 50;

type TheoryMarksLike = {
  phaseTest1Marks?: number | null;
  phaseTest2Marks?: number | null;
  tutorial?: unknown;
  finalMarks?: number | null;
};

function toPositiveNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

export function normalizePhaseTestCount(
  count: number | null | undefined,
  hasTheory = true,
): number {
  if (!hasTheory) return 0;
  const parsed = Number(count);
  if (!Number.isFinite(parsed)) return DEFAULT_PHASE_TEST_COUNT;
  return Math.min(MAX_PHASE_TEST_COUNT, Math.max(0, Math.trunc(parsed)));
}

export function getTheoryPhaseTestValue(
  theory: TheoryMarksRecord | null | undefined,
  index: number,
): number | null {
  if (!theory) return null;
  if (index === 1) return theory.phaseTest1Marks ?? null;
  if (index === 2) return theory.phaseTest2Marks ?? null;
  return null;
}

export function computeTheorySessional(
  theory: TheoryMarksLike | null | undefined,
  phaseTestCount: number | null | undefined,
): number {
  if (!theory) return 0;
  const normalizedCount = normalizePhaseTestCount(phaseTestCount);
  let total = toPositiveNumber(theory.tutorial);

  if (normalizedCount >= 1) {
    total += toPositiveNumber(theory.phaseTest1Marks);
  }
  if (normalizedCount >= 2) {
    total += toPositiveNumber(theory.phaseTest2Marks);
  }

  return total;
}

export function computeTheoryTotal(
  theory: TheoryMarksLike | null | undefined,
  phaseTestCount: number | null | undefined,
): number {
  return computeTheorySessional(theory, phaseTestCount) + toPositiveNumber(theory?.finalMarks);
}

export function computeTheorySessionalMax(phaseTestCount: number | null | undefined): number {
  return normalizePhaseTestCount(phaseTestCount) * PHASE_TEST_MAX_MARKS + THEORY_TUTORIAL_MAX_MARKS;
}

export function computeTheoryTotalMax(phaseTestCount: number | null | undefined): number {
  return computeTheorySessionalMax(phaseTestCount) + THEORY_FINAL_MAX_MARKS;
}
