import {
  DEFAULT_GRADE_POINT_BANDS,
  DEFAULT_LETTER_GRADE_BANDS,
  LETTER_GRADE_VALUES,
  type GradePointBand,
  type LetterGrade,
  type LetterGradeBand,
} from '@/app/lib/grading';

export type GpaFormulaTemplate = 'CREDIT_WEIGHTED' | 'SEMESTER_AVG';

export type AcademicGradingPolicy = {
  letterGradeBands: LetterGradeBand[];
  gradePointBands: GradePointBand[];
  sgpaFormulaTemplate: GpaFormulaTemplate;
  cgpaFormulaTemplate: GpaFormulaTemplate;
  roundingScale: number;
};

export const DEFAULT_ACADEMIC_GRADING_POLICY: AcademicGradingPolicy = {
  letterGradeBands: DEFAULT_LETTER_GRADE_BANDS,
  gradePointBands: DEFAULT_GRADE_POINT_BANDS,
  sgpaFormulaTemplate: 'CREDIT_WEIGHTED',
  cgpaFormulaTemplate: 'CREDIT_WEIGHTED',
  roundingScale: 2,
};

const VALID_LETTER_GRADES = new Set<string>(LETTER_GRADE_VALUES);
const VALID_GPA_TEMPLATES = new Set<GpaFormulaTemplate>(['CREDIT_WEIGHTED', 'SEMESTER_AVG']);

function toFiniteNumber(value: number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMinMarks(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.floor(numeric)));
}

function normalizeRoundingScale(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_ACADEMIC_GRADING_POLICY.roundingScale;
  return Math.max(0, Math.min(6, Math.floor(numeric)));
}

function normalizeLetterBandGrade(value: unknown): LetterGrade {
  const grade = String(value ?? '').trim().toUpperCase();
  if (VALID_LETTER_GRADES.has(grade)) {
    return grade as LetterGrade;
  }
  return 'F';
}

function normalizePoint(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(10, Math.floor(numeric)));
}

function sortBands<T extends { minMarks: number }>(bands: T[]): T[] {
  return [...bands].sort((a, b) => b.minMarks - a.minMarks);
}

function uniqByMinMarks<T extends { minMarks: number }>(bands: T[]): T[] {
  const seen = new Set<number>();
  const deduped: T[] = [];
  for (const band of sortBands(bands)) {
    if (seen.has(band.minMarks)) continue;
    seen.add(band.minMarks);
    deduped.push(band);
  }
  return deduped;
}

export function normalizeLetterGradeBands(input: unknown): LetterGradeBand[] {
  if (!Array.isArray(input) || input.length === 0) {
    return DEFAULT_ACADEMIC_GRADING_POLICY.letterGradeBands;
  }

  const bands = input.map((item) => ({
    minMarks: normalizeMinMarks((item as any)?.minMarks),
    grade: normalizeLetterBandGrade((item as any)?.grade),
  }));

  const deduped = uniqByMinMarks(bands);
  const hasFloor = deduped.some((band) => band.minMarks === 0);
  if (!hasFloor) deduped.push({ minMarks: 0, grade: 'F' });
  return sortBands(deduped);
}

export function normalizeGradePointBands(input: unknown): GradePointBand[] {
  if (!Array.isArray(input) || input.length === 0) {
    return DEFAULT_ACADEMIC_GRADING_POLICY.gradePointBands;
  }

  const bands = input.map((item) => ({
    minMarks: normalizeMinMarks((item as any)?.minMarks),
    points: normalizePoint((item as any)?.points),
  }));

  const deduped = uniqByMinMarks(bands);
  const hasFloor = deduped.some((band) => band.minMarks === 0);
  if (!hasFloor) deduped.push({ minMarks: 0, points: 0 });
  return sortBands(deduped);
}

export function normalizeGpaTemplate(input: unknown, fallback: GpaFormulaTemplate): GpaFormulaTemplate {
  const normalized = String(input ?? '').trim().toUpperCase() as GpaFormulaTemplate;
  if (VALID_GPA_TEMPLATES.has(normalized)) return normalized;
  return fallback;
}

export function normalizeAcademicGradingPolicy(
  input: Partial<AcademicGradingPolicy> | null | undefined
): AcademicGradingPolicy {
  const source = input ?? {};
  return {
    letterGradeBands: normalizeLetterGradeBands(source.letterGradeBands),
    gradePointBands: normalizeGradePointBands(source.gradePointBands),
    sgpaFormulaTemplate: normalizeGpaTemplate(
      source.sgpaFormulaTemplate,
      DEFAULT_ACADEMIC_GRADING_POLICY.sgpaFormulaTemplate
    ),
    cgpaFormulaTemplate: normalizeGpaTemplate(
      source.cgpaFormulaTemplate,
      DEFAULT_ACADEMIC_GRADING_POLICY.cgpaFormulaTemplate
    ),
    roundingScale: normalizeRoundingScale(source.roundingScale),
  };
}

export function marksToLetterGradeWithPolicy(
  marks: number | null | undefined,
  policy: Pick<AcademicGradingPolicy, 'letterGradeBands'>
): LetterGrade {
  const normalized = Math.max(0, toFiniteNumber(marks));
  for (const band of sortBands(policy.letterGradeBands)) {
    if (normalized >= band.minMarks) return band.grade;
  }
  return 'F';
}

export function marksToGradePointsWithPolicy(
  marks: number | null | undefined,
  policy: Pick<AcademicGradingPolicy, 'gradePointBands'>
): number {
  const normalized = Math.max(0, toFiniteNumber(marks));
  for (const band of sortBands(policy.gradePointBands)) {
    if (normalized >= band.minMarks) return band.points;
  }
  return 0;
}

export function roundPolicyValue(value: number | null, roundingScale: number): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const scale = normalizeRoundingScale(roundingScale);
  const multiplier = 10 ** scale;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}
