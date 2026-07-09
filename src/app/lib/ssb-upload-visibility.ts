export type SsbUploadCourseWindow = {
  courseStartDate: string | null;
  courseEndDate: string | null;
  defaultVisibleUntil: string | null;
};

export type SsbUploadVisibilitySettingLike = {
  hiddenDays: number;
  visibleUntil: string;
};

export type SsbUploadVisibilityDecision = SsbUploadCourseWindow & {
  canView: boolean;
  reason: string | null;
  hiddenDays: number | null;
  visibleFrom: string | null;
  visibleUntil: string | null;
  hasConfiguredSettings: boolean;
};

const ADMIN_TOKENS = new Set(["ADMIN", "SUPER_ADMIN", "COMMANDANT"]);

function parseIsoDate(value: string | null | undefined): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day);
  const parsed = new Date(utc);
  return parsed.toISOString().slice(0, 10) === value ? utc : null;
}

export function toIsoDateOnly(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : null;
}

export function addIsoDays(value: string | null | undefined, days: number): string | null {
  const start = parseIsoDate(value);
  if (start == null || !Number.isFinite(days)) return null;
  return new Date(start + Math.trunc(days) * 86_400_000).toISOString().slice(0, 10);
}

export function parseSsbCourseDatesFromNotes(notes: string | null | undefined): SsbUploadCourseWindow {
  const startDate = notes?.match(/Start:\s*(\d{4}-\d{2}-\d{2})/i)?.[1] ?? null;
  const endDate = notes?.match(/End:\s*(\d{4}-\d{2}-\d{2})/i)?.[1] ?? null;
  const courseStartDate = parseIsoDate(startDate) == null ? null : startDate;
  const courseEndDate = parseIsoDate(endDate) == null ? null : endDate;
  return {
    courseStartDate,
    courseEndDate,
    defaultVisibleUntil: addIsoDays(courseEndDate, 1),
  };
}

export function isSsbUploadAdminViewer(input: { roles?: string[] | null; positionKey?: string | null }) {
  const tokens = [...(input.roles ?? []), input.positionKey ?? ""].map((value) => value.trim().toUpperCase());
  return tokens.some((token) => ADMIN_TOKENS.has(token));
}

export function resolveSsbUploadVisibility(input: {
  courseWindow: SsbUploadCourseWindow;
  setting: SsbUploadVisibilitySettingLike | null;
  hasConfiguredSettings: boolean;
  viewerIsAdmin?: boolean;
  today?: string;
}): SsbUploadVisibilityDecision {
  const { courseWindow, setting, hasConfiguredSettings } = input;
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const visibleFrom = setting ? addIsoDays(courseWindow.courseStartDate, setting.hiddenDays) : null;
  const visibleUntil = setting?.visibleUntil ?? null;
  const base = {
    ...courseWindow,
    hiddenDays: setting?.hiddenDays ?? null,
    visibleFrom,
    visibleUntil,
    hasConfiguredSettings,
  };

  if (input.viewerIsAdmin || !hasConfiguredSettings) return { ...base, canView: true, reason: null };
  if (!setting) return { ...base, canView: false, reason: "SSB PDF viewing is not configured for your appointment." };
  if (!courseWindow.courseStartDate || !visibleFrom) {
    return { ...base, canView: false, reason: "Course start date is not available for SSB PDF visibility." };
  }
  if (today < visibleFrom) {
    return { ...base, canView: false, reason: `SSB PDF viewing starts on ${visibleFrom}.` };
  }
  if (visibleUntil && today > visibleUntil) {
    return { ...base, canView: false, reason: `SSB PDF viewing ended on ${visibleUntil}.` };
  }
  return { ...base, canView: true, reason: null };
}
