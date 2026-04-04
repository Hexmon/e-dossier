import { isScopedPlatoonCommander, normalizeAccessToken } from "@/lib/platoon-commander-access";

type InterviewTickerAccessInput = {
  roles?: Array<string | null | undefined> | null;
  position?: string | null;
  scopeType?: string | null;
};

function collectTokens(input: InterviewTickerAccessInput): string[] {
  const out = (input.roles ?? [])
    .map((value) => normalizeAccessToken(value))
    .filter(Boolean);
  const positionToken = normalizeAccessToken(input.position);
  if (positionToken) {
    out.push(positionToken);
  }
  return out;
}

export function isPlatoonCommanderDashboardUser(input: InterviewTickerAccessInput): boolean {
  return isScopedPlatoonCommander(input);
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
