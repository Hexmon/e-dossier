export const DOSSIER_SEMESTERS = [1, 2, 3, 4, 5, 6] as const;

type ResolveDossierSemesterParams = {
  requestedSemester?: number | string | null;
  currentSemester?: number | null;
  supportedSemesters?: readonly number[];
};

type BuildSemesterSearchParams = {
  semester: number;
  queryKey?: string;
  legacyQueryKeys?: readonly string[];
};

export function normalizeSemesterValue(value: number | string | null | undefined): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  if (parsed < 1 || parsed > 6) return null;
  return parsed;
}

export function normalizeSupportedSemesters(supportedSemesters?: readonly number[]): number[] {
  const base = supportedSemesters?.length ? supportedSemesters : DOSSIER_SEMESTERS;
  const normalized = Array.from(
    new Set(base.map((value) => normalizeSemesterValue(value)).filter((value): value is number => value !== null))
  ).sort((left, right) => left - right);

  return normalized.length ? normalized : [...DOSSIER_SEMESTERS];
}

export function normalizeCurrentSemester(currentSemester?: number | null): number {
  return normalizeSemesterValue(currentSemester) ?? 1;
}

export function clampSemesterToSupported(semester: number, supportedSemesters: readonly number[]): number {
  const normalizedSupported = normalizeSupportedSemesters(supportedSemesters);
  const minimum = normalizedSupported[0] ?? 1;
  const maximum = normalizedSupported[normalizedSupported.length - 1] ?? 6;

  if (semester <= minimum) return minimum;
  if (semester >= maximum) return maximum;
  if (normalizedSupported.includes(semester)) return semester;

  return normalizedSupported.reduce((closest, candidate) => {
    if (Math.abs(candidate - semester) < Math.abs(closest - semester)) return candidate;
    return closest;
  }, minimum);
}

export function resolveDossierSemester({
  requestedSemester,
  currentSemester,
  supportedSemesters,
}: ResolveDossierSemesterParams) {
  const normalizedSupportedSemesters = normalizeSupportedSemesters(supportedSemesters);
  const normalizedCurrentSemester = normalizeCurrentSemester(currentSemester);
  const normalizedRequestedSemester = normalizeSemesterValue(requestedSemester);
  const canonicalCurrentSemester = clampSemesterToSupported(
    normalizedCurrentSemester,
    normalizedSupportedSemesters
  );
  const activeSemester =
    normalizedRequestedSemester !== null && normalizedSupportedSemesters.includes(normalizedRequestedSemester)
      ? normalizedRequestedSemester
      : canonicalCurrentSemester;

  return {
    activeSemester,
    canonicalCurrentSemester,
    currentSemester: normalizedCurrentSemester,
    requestedSemester: normalizedRequestedSemester,
    supportedSemesters: normalizedSupportedSemesters,
  };
}

export function buildSemesterSearchParams(
  search: string | URLSearchParams,
  { semester, queryKey = "semester", legacyQueryKeys = ["sem", "semister"] }: BuildSemesterSearchParams
): URLSearchParams {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : new URLSearchParams(search.toString());

  params.set(queryKey, String(semester));
  for (const legacyKey of legacyQueryKeys) {
    if (legacyKey !== queryKey) {
      params.delete(legacyKey);
    }
  }

  return params;
}

export function isDossierSemesterLocked(params: {
  semester: number;
  currentSemester?: number | null;
  canBypassLock?: boolean;
}) {
  if (params.canBypassLock) return false;
  const normalizedCurrentSemester = normalizeCurrentSemester(params.currentSemester);
  return normalizeSemesterValue(params.semester) !== normalizedCurrentSemester;
}

