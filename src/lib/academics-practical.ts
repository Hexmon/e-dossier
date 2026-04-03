export const PRACTICAL_COMPONENTS = [
  { key: 'conductOfExp', label: 'Conduct of Exp', maxMarks: 20 },
  { key: 'maintOfApp', label: 'Maint of App', maxMarks: 20 },
  { key: 'practicalTest', label: 'Practical Test', maxMarks: 45 },
  { key: 'vivaVoce', label: 'Viva Voce', maxMarks: 15 },
] as const;

export type PracticalComponentKey = (typeof PRACTICAL_COMPONENTS)[number]['key'];

type PracticalMarksLike = Partial<Record<PracticalComponentKey, unknown>> & {
  finalMarks?: unknown;
  totalMarks?: unknown;
};

function toPositiveNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

export function hasStructuredPracticalMarks(practical?: PracticalMarksLike | null): boolean {
  if (!practical) return false;
  return PRACTICAL_COMPONENTS.some(({ key }) => practical[key] !== undefined && practical[key] !== null);
}

export function getPracticalComponentValue(
  practical: PracticalMarksLike | null | undefined,
  key: PracticalComponentKey
): number | null {
  if (!practical) return null;

  const value = practical[key];
  if (value !== undefined && value !== null) {
    return toPositiveNumber(value);
  }

  if (!hasStructuredPracticalMarks(practical) && key === 'practicalTest') {
    const legacy = practical.totalMarks ?? practical.finalMarks;
    if (legacy !== undefined && legacy !== null) {
      return toPositiveNumber(legacy);
    }
  }

  return null;
}

export function computePracticalTotal(practical?: PracticalMarksLike | null): number {
  if (!practical) return 0;

  if (hasStructuredPracticalMarks(practical)) {
    return PRACTICAL_COMPONENTS.reduce(
      (sum, { key }) => sum + toPositiveNumber(getPracticalComponentValue(practical, key)),
      0
    );
  }

  return toPositiveNumber(practical.totalMarks ?? practical.finalMarks);
}

export const PRACTICAL_TOTAL_MAX_MARKS = PRACTICAL_COMPONENTS.reduce(
  (sum, component) => sum + component.maxMarks,
  0
);
