export const LETTER_GRADE_VALUES = ['AP', 'AO', 'AM', 'BP', 'BO', 'BM', 'CP', 'CO', 'CM', 'F'] as const;

export type LetterGrade = (typeof LETTER_GRADE_VALUES)[number];

export type LetterGradeBand = {
  minMarks: number;
  grade: LetterGrade;
};

export type GradePointBand = {
  minMarks: number;
  points: number;
};

export const DEFAULT_LETTER_GRADE_BANDS: LetterGradeBand[] = [
  { minMarks: 80, grade: 'AP' },
  { minMarks: 70, grade: 'AO' },
  { minMarks: 60, grade: 'AM' },
  { minMarks: 55, grade: 'BP' },
  { minMarks: 50, grade: 'BO' },
  { minMarks: 45, grade: 'BM' },
  { minMarks: 41, grade: 'CP' },
  { minMarks: 38, grade: 'CO' },
  { minMarks: 35, grade: 'CM' },
  { minMarks: 0, grade: 'F' },
];

export const DEFAULT_GRADE_POINT_BANDS: GradePointBand[] = [
  { minMarks: 80, points: 9 },
  { minMarks: 70, points: 8 },
  { minMarks: 60, points: 7 },
  { minMarks: 55, points: 6 },
  { minMarks: 50, points: 5 },
  { minMarks: 45, points: 4 },
  { minMarks: 41, points: 3 },
  { minMarks: 38, points: 2 },
  { minMarks: 35, points: 1 },
  { minMarks: 0, points: 0 },
];

function toFiniteNumber(value: number | null | undefined): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function normalizeBands<T extends { minMarks: number }>(bands: T[]): T[] {
  return [...bands].sort((a, b) => b.minMarks - a.minMarks);
}

export function marksToGradePoints(marks: number | null | undefined): number {
  const normalized = Math.max(0, toFiniteNumber(marks));
  const bands = normalizeBands(DEFAULT_GRADE_POINT_BANDS);
  for (const band of bands) {
    if (normalized >= band.minMarks) return band.points;
  }
  return 0;
}

export function marksToLetterGrade(marks: number | null | undefined): LetterGrade {
  const normalized = Math.max(0, toFiniteNumber(marks));
  const bands = normalizeBands(DEFAULT_LETTER_GRADE_BANDS);
  for (const band of bands) {
    if (normalized >= band.minMarks) return band.grade;
  }
  return 'F';
}
