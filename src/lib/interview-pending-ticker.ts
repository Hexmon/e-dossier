type InterviewTickerAccessInput = {
  roles?: Array<string | null | undefined> | null;
  position?: string | null;
  scopeType?: string | null;
};

function normalizeToken(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function collectTokens(input: InterviewTickerAccessInput): string[] {
  const out = (input.roles ?? [])
    .map((value) => normalizeToken(value))
    .filter(Boolean);
  const positionToken = normalizeToken(input.position);
  if (positionToken) {
    out.push(positionToken);
  }
  return out;
}

function isPlatoonCommanderToken(token: string): boolean {
  if (!token) return false;
  if (token === "PLATOON_COMMANDER" || token === "PLATOON_CDR") return true;
  if (token === "PL_CDR" || token === "PLCDR") return true;

  const compact = token.replace(/[^A-Z0-9]/g, "");
  if (compact.includes("PLATOONCOMMANDER")) return true;
  return compact.endsWith("PLCDR");
}

export function isPlatoonCommanderDashboardUser(input: InterviewTickerAccessInput): boolean {
  const scopeType = normalizeToken(input.scopeType);
  if (scopeType !== "PLATOON") return false;

  return collectTokens(input).some((token) => isPlatoonCommanderToken(token));
}

export function isAdminDashboardUser(input: InterviewTickerAccessInput): boolean {
  return collectTokens(input).some((token) => token === "ADMIN" || token === "SUPER_ADMIN");
}

export function canAccessInterviewPendingTickerSetting(input: InterviewTickerAccessInput): boolean {
  return isAdminDashboardUser(input) || isPlatoonCommanderDashboardUser(input);
}

export function buildInterviewPendingByDaysText(days: number): string {
  const safeDays = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0;
  return `*** INTERVIEW PENDING BY ${safeDays} DAYS ***`;
}

function parseIsoDate(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const utc = Date.UTC(year, month - 1, day);
  const parsed = new Date(utc);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return utc;
}

export function getDaysBetweenDates(startDate: string, endDate: string): number {
  const startUtc = parseIsoDate(startDate);
  const endUtc = parseIsoDate(endDate);

  if (startUtc == null || endUtc == null) {
    return 0;
  }

  const diffMs = endUtc - startUtc;
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / 86_400_000);
}
