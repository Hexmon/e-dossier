export const DEFAULT_TIMEZONE = "Asia/Kolkata" as const;

export function formatInDefaultTimezone(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: DEFAULT_TIMEZONE,
    ...options,
  }).format(date);
}
