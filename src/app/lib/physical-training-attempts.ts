const FREE_ENTRY_PT_ATTEMPT_CODES = new Set(['A1/C1', 'A2/C2', 'A3/C3']);

function normalizePtAttemptCode(code: string | null | undefined) {
  return String(code ?? '').trim().toUpperCase();
}

export function isFreeEntryPtAttemptCode(code: string | null | undefined) {
  return FREE_ENTRY_PT_ATTEMPT_CODES.has(normalizePtAttemptCode(code));
}

export function resolvePtDraftMarks(
  attemptCode: string | null | undefined,
  maxMarks: number,
  savedMarks?: number | null,
) {
  if (savedMarks !== null && savedMarks !== undefined && Number.isFinite(Number(savedMarks))) {
    return Number(savedMarks);
  }
  return isFreeEntryPtAttemptCode(attemptCode) ? null : maxMarks;
}
