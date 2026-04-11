import {
  marksToGradePointsWithPolicy,
  marksToLetterGradeWithPolicy,
  roundPolicyValue,
  type AcademicGradingPolicy,
} from "@/app/lib/grading-policy";

export type TheoryMarksLike = {
  totalMarks?: number | null;
  phaseTest1Marks?: unknown;
  phaseTest2Marks?: unknown;
  tutorial?: unknown;
  finalMarks?: unknown;
};

export type PracticalMarksLike = {
  totalMarks?: number | null;
  contentOfExpMarks?: unknown;
  maintOfExpMarks?: unknown;
  practicalMarks?: unknown;
  vivaMarks?: unknown;
  finalMarks?: unknown;
};

export type AcademicGpaComponent = {
  credits: number;
  points: number;
  weighted: number;
};

export type AcademicCumulativeSemester = {
  sgpa: number | null;
  components: AcademicGpaComponent[];
};

export type AcademicSubjectLike = {
  includeTheory?: boolean | null;
  includePractical?: boolean | null;
  theoryCredits?: unknown;
  practicalCredits?: unknown;
  subject?: {
    defaultTheoryCredits?: unknown;
    defaultPracticalCredits?: unknown;
  } | null;
  theory?: TheoryMarksLike | null;
  practical?: PracticalMarksLike | null;
};

export function toFiniteAcademicNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return 0;

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) return numeric;

    const match = trimmed.match(/-?\d+(?:\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }

  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toPositiveAcademicNumber(value: unknown): number {
  return Math.max(0, toFiniteAcademicNumber(value));
}

export function normalizeAcademicGrade(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

export function normalizeAcademicCredits(value: unknown): number {
  return Math.max(0, toFiniteAcademicNumber(value));
}

export function hasAcademicCredits(value: unknown): boolean {
  return normalizeAcademicCredits(value) > 0;
}

export function computeTheorySessionalMarks(theory?: TheoryMarksLike | null): number {
  if (!theory) return 0;

  return (
    toPositiveAcademicNumber(theory.phaseTest1Marks) +
    toPositiveAcademicNumber(theory.phaseTest2Marks) +
    toPositiveAcademicNumber(theory.tutorial)
  );
}

export function computeTheoryTotalMarks(theory?: TheoryMarksLike | null): number {
  if (!theory) return 0;
  return computeTheorySessionalMarks(theory) + toPositiveAcademicNumber(theory.finalMarks);
}

export function computePracticalTotalMarks(practical?: PracticalMarksLike | null): number {
  if (!practical) return 0;

  const contentOfExpMarks = toPositiveAcademicNumber(practical.contentOfExpMarks);
  const maintOfExpMarks = toPositiveAcademicNumber(practical.maintOfExpMarks);
  const practicalMarks = toPositiveAcademicNumber(practical.practicalMarks);
  const vivaMarks = toPositiveAcademicNumber(practical.vivaMarks);

  const hasBreakdown = [
    practical.contentOfExpMarks,
    practical.maintOfExpMarks,
    practical.practicalMarks,
    practical.vivaMarks,
  ].some((value) => value !== null && value !== undefined);

  if (hasBreakdown) {
    return contentOfExpMarks + maintOfExpMarks + practicalMarks + vivaMarks;
  }

  return toPositiveAcademicNumber(practical.finalMarks);
}

export function resolveTheoryTotalMarks(theory?: TheoryMarksLike | null): number | null {
  if (!theory) return null;

  const explicit = Number(theory.totalMarks);
  if (theory.totalMarks !== null && theory.totalMarks !== undefined && Number.isFinite(explicit)) {
    return explicit;
  }

  const computed = computeTheoryTotalMarks(theory);
  return computed > 0 ? computed : null;
}

export function resolvePracticalTotalMarks(practical?: PracticalMarksLike | null): number | null {
  if (!practical) return null;

  const explicit = Number(practical.totalMarks);
  if (practical.totalMarks !== null && practical.totalMarks !== undefined && Number.isFinite(explicit)) {
    return explicit;
  }

  const computed = computePracticalTotalMarks(practical);
  return computed > 0 ? computed : null;
}

export function deriveTheoryLetterGrade(
  theory: TheoryMarksLike | null | undefined,
  policy: AcademicGradingPolicy
): string {
  return marksToLetterGradeWithPolicy(computeTheoryTotalMarks(theory), policy);
}

export function derivePracticalLetterGrade(
  practical: PracticalMarksLike | null | undefined,
  policy: AcademicGradingPolicy
): string {
  return marksToLetterGradeWithPolicy(computePracticalTotalMarks(practical), policy);
}

export function resolveStoredOrDerivedAcademicLetterGrade(
  storedGrade: string | null | undefined,
  marks: number | null | undefined,
  policy: AcademicGradingPolicy
): string | null {
  const numericMarks = Number(marks);
  if (marks !== null && marks !== undefined && Number.isFinite(numericMarks)) {
    return marksToLetterGradeWithPolicy(numericMarks, policy);
  }

  const normalized = normalizeAcademicGrade(storedGrade);
  return normalized || null;
}

export function buildAcademicGpaComponent(
  marks: number | null | undefined,
  credits: unknown,
  policy: AcademicGradingPolicy
): AcademicGpaComponent | null {
  const normalizedCredits = normalizeAcademicCredits(credits);
  if (normalizedCredits <= 0) return null;

  const points = marksToGradePointsWithPolicy(marks ?? 0, policy);
  return {
    credits: normalizedCredits,
    points,
    weighted: normalizedCredits * points,
  };
}

export function resolveAcademicTheoryCredits(subject: AcademicSubjectLike): number {
  return normalizeAcademicCredits(subject.theoryCredits ?? subject.subject?.defaultTheoryCredits ?? 0);
}

export function resolveAcademicPracticalCredits(subject: AcademicSubjectLike): number {
  return normalizeAcademicCredits(subject.practicalCredits ?? subject.subject?.defaultPracticalCredits ?? 0);
}

export function buildAcademicSubjectGpaComponents(
  subject: AcademicSubjectLike,
  policy: AcademicGradingPolicy
): AcademicGpaComponent[] {
  const components: AcademicGpaComponent[] = [];

  if (subject.includeTheory) {
    const component = buildAcademicGpaComponent(
      resolveTheoryTotalMarks(subject.theory),
      resolveAcademicTheoryCredits(subject),
      policy
    );
    if (component) components.push(component);
  }

  if (subject.includePractical) {
    const component = buildAcademicGpaComponent(
      resolvePracticalTotalMarks(subject.practical),
      resolveAcademicPracticalCredits(subject),
      policy
    );
    if (component) components.push(component);
  }

  return components;
}

export function buildAcademicSubjectsGpaComponents(
  subjects: AcademicSubjectLike[] | null | undefined,
  policy: AcademicGradingPolicy
): AcademicGpaComponent[] {
  return (subjects ?? []).flatMap((subject) => buildAcademicSubjectGpaComponents(subject, policy));
}

export function summarizeAcademicGpaComponents(components: AcademicGpaComponent[]) {
  const totalCredits = components.reduce((sum, component) => sum + component.credits, 0);
  const totalWeighted = components.reduce((sum, component) => sum + component.weighted, 0);
  const totalPoints = components.reduce((sum, component) => sum + component.points, 0);

  return {
    totalCredits,
    totalWeighted,
    totalPoints,
    pointComponents: components.length,
  };
}

export function summarizeAcademicSubjects(
  subjects: AcademicSubjectLike[] | null | undefined,
  policy: AcademicGradingPolicy
) {
  const components = buildAcademicSubjectsGpaComponents(subjects, policy);
  return {
    components,
    ...summarizeAcademicGpaComponents(components),
    sgpa: computeAcademicSgpa(components, policy),
  };
}

export function computeAcademicSgpa(
  components: AcademicGpaComponent[],
  policy: AcademicGradingPolicy
): number | null {
  if (!components.length) return null;

  const { totalCredits, totalWeighted, totalPoints, pointComponents } =
    summarizeAcademicGpaComponents(components);

  if (policy.sgpaFormulaTemplate === "SEMESTER_AVG") {
    if (pointComponents <= 0) return null;
    return roundPolicyValue(totalPoints / pointComponents, policy.roundingScale);
  }

  if (totalCredits <= 0) return null;
  return roundPolicyValue(totalWeighted / totalCredits, policy.roundingScale);
}

export function computeAcademicCgpa(
  semesters: AcademicCumulativeSemester[],
  index: number,
  policy: AcademicGradingPolicy
): number | null {
  const upto = semesters.slice(0, index + 1);
  if (!upto.length) return null;

  if (policy.cgpaFormulaTemplate === "SEMESTER_AVG") {
    const sgpas = upto.map((entry) => entry.sgpa).filter((value): value is number => value !== null);
    if (!sgpas.length) return null;
    return roundPolicyValue(
      sgpas.reduce((sum, value) => sum + value, 0) / sgpas.length,
      policy.roundingScale
    );
  }

  const components = upto.flatMap((entry) => entry.components);
  const { totalCredits, totalWeighted } = summarizeAcademicGpaComponents(components);
  if (totalCredits <= 0) return null;
  return roundPolicyValue(totalWeighted / totalCredits, policy.roundingScale);
}
