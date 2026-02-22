export const DEFAULT_PLATOON_THEME_COLOR = ['#', '1D4ED8'].join('');

export function normalizePlatoonThemeColor(value: string | null | undefined) {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return DEFAULT_PLATOON_THEME_COLOR;

  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const upper = withHash.toUpperCase();
  return /^#[0-9A-F]{6}$/.test(upper) ? upper : DEFAULT_PLATOON_THEME_COLOR;
}
