const DEFAULT_ODT_AXIS_MAX = 150;
const TERM_COUNT = 6;

function toFiniteNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function normalizeSeries(values: number[] | undefined) {
  return Array.from({ length: TERM_COUNT }, (_, index) => toFiniteNumber(values?.[index]));
}

function nextStep(value: number) {
  if (value <= 100) return 10;
  if (value <= 250) return 25;
  return 50;
}

export function resolveOdtChartScale({
  data,
  averageData,
  maxMarks,
}: {
  data: number[];
  averageData: number[];
  maxMarks?: number[];
}) {
  const termMaxMarks = normalizeSeries(maxMarks);
  const observedMax = Math.max(
    ...normalizeSeries(data),
    ...normalizeSeries(averageData),
    ...termMaxMarks,
    DEFAULT_ODT_AXIS_MAX,
  );
  const paddedMax = observedMax * 1.08;
  const stepSize = nextStep(paddedMax);
  const axisMax = Math.max(stepSize, Math.ceil(paddedMax / stepSize) * stepSize);

  return {
    axisMax,
    stepSize,
    termMaxMarks,
  };
}

export function formatOdtMarks(
  value: number,
  termIndex: number,
  termMaxMarks: number[],
  fallbackMax: number,
) {
  const termMax = toFiniteNumber(termMaxMarks[termIndex]);
  const denominator = termMax > 0 ? termMax : fallbackMax;
  return `${toFiniteNumber(value)}/${denominator}`;
}
