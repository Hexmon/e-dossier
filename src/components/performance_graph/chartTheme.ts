import { DEVICE_SITE_SETTINGS_EVENT } from "@/lib/device-site-settings";

export type ChartThemePalette = {
  primary: string;
  info: string;
  success: string;
  warning: string;
  destructive: string;
  foreground: string;
  mutedForeground: string;
  border: string;
  surface: string;
  tooltipBackground: string;
  pointBorder: string;
};

const FALLBACK_THEME: ChartThemePalette = {
  primary: "oklch(0.62 0.16 250)",
  info: "oklch(0.64 0.13 265)",
  success: "oklch(0.69 0.18 150)",
  warning: "oklch(0.79 0.16 85)",
  destructive: "oklch(0.64 0.22 27)",
  foreground: "oklch(0.2 0.04 240)",
  mutedForeground: "oklch(0.55 0.03 240)",
  border: "oklch(0.9 0.01 240)",
  surface: "oklch(1 0 0)",
  tooltipBackground: "rgba(0, 0, 0, 0.82)",
  pointBorder: "white",
};

function resolveCssVar(varName: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || fallback;
}

function toRgb(color: string): [number, number, number] | null {
  if (typeof document === "undefined") return null;
  const probe = document.createElement("span");
  probe.style.color = color;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  const match = resolved.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function withAlpha(color: string, alpha: number): string {
  const rgb = toRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export function getChartThemePalette(): ChartThemePalette {
  const primary = resolveCssVar("--primary", FALLBACK_THEME.primary);
  const info = resolveCssVar("--info", FALLBACK_THEME.info);
  const success = resolveCssVar("--success", FALLBACK_THEME.success);
  const warning = resolveCssVar("--warning", FALLBACK_THEME.warning);
  const destructive = resolveCssVar("--destructive", FALLBACK_THEME.destructive);
  const foreground = resolveCssVar("--foreground", FALLBACK_THEME.foreground);
  const mutedForeground = resolveCssVar("--muted-foreground", FALLBACK_THEME.mutedForeground);
  const border = resolveCssVar("--border", FALLBACK_THEME.border);
  const surface = resolveCssVar("--card", FALLBACK_THEME.surface);

  return {
    primary,
    info,
    success,
    warning,
    destructive,
    foreground,
    mutedForeground,
    border,
    surface,
    tooltipBackground: FALLBACK_THEME.tooltipBackground,
    pointBorder: FALLBACK_THEME.pointBorder,
  };
}

export function addThemeChangedListener(onThemeChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(DEVICE_SITE_SETTINGS_EVENT, onThemeChange);
  return () => window.removeEventListener(DEVICE_SITE_SETTINGS_EVENT, onThemeChange);
}
