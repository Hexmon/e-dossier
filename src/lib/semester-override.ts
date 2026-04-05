export const SEMESTER_OVERRIDE_REASON_HEADER = "X-Semester-Override-Reason";

export type SemesterOverrideOptions = {
  overrideReason?: string;
};

export function normalizeSemesterOverrideReason(value?: string | null): string | null {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}
