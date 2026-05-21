const COURSE_SEQUENCE_CODE_REGEX = /^([A-Za-z][A-Za-z0-9]*)[-=]0*(\d+)$/;

export function normalizeCourseCode(code: string) {
  const trimmed = code.trim();
  const match = COURSE_SEQUENCE_CODE_REGEX.exec(trimmed);
  if (!match) return trimmed;

  return `${match[1].toUpperCase()}-${Number(match[2])}`;
}
