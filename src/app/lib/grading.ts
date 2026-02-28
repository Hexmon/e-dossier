export const LETTER_GRADE_VALUES = ['AP', 'AO', 'AM', 'BP', 'BO', 'BM', 'CP', 'CO', 'CM', 'F'] as const;

export type LetterGrade = (typeof LETTER_GRADE_VALUES)[number];

function toFiniteNumber(value: number | null | undefined): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export function marksToGradePoints(marks: number | null | undefined): number {
  const normalized = Math.max(0, toFiniteNumber(marks));
  if (normalized >= 80) return 9;
  if (normalized >= 70) return 8;
  if (normalized >= 60) return 7;
  if (normalized >= 55) return 6;
  if (normalized >= 50) return 5;
  if (normalized >= 45) return 4;
  if (normalized >= 41) return 3;
  if (normalized >= 38) return 2;
  if (normalized >= 35) return 1;
  return 0;
}

export function marksToLetterGrade(marks: number | null | undefined): LetterGrade {
  // TODO: Replace temporary marks->letter grade bands with official university mapping once confirmed.
  const normalized = Math.max(0, toFiniteNumber(marks));
  if (normalized >= 90) return 'AP';
  if (normalized >= 80) return 'AO';
  if (normalized >= 70) return 'AM';
  if (normalized >= 60) return 'BP';
  if (normalized >= 55) return 'BO';
  if (normalized >= 50) return 'BM';
  if (normalized >= 45) return 'CP';
  if (normalized >= 40) return 'CO';
  if (normalized >= 35) return 'CM';
  return 'F';
}
