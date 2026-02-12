export const ACCENT_PALETTE_KEYS = ["blue", "teal", "amber", "purple", "red"] as const;

export type AccentPaletteKey = (typeof ACCENT_PALETTE_KEYS)[number];

export type AccentPaletteTokens = {
  primary: string;
  accent: string;
  ring: string;
};

export type AccentPaletteMeta = {
  label: string;
  swatch: string;
  tokens: AccentPaletteTokens;
};

export const ACCENT_PALETTE_META: Record<AccentPaletteKey, AccentPaletteMeta> = {
  blue: {
    label: "Blue",
    swatch: "hsl(217 91% 60%)",
    tokens: {
      primary: "217 91% 60%",
      accent: "217 70% 52%",
      ring: "217 91% 60%",
    },
  },
  teal: {
    label: "Teal",
    swatch: "hsl(172 66% 45%)",
    tokens: {
      primary: "172 66% 45%",
      accent: "172 55% 38%",
      ring: "172 66% 45%",
    },
  },
  amber: {
    label: "Amber",
    swatch: "hsl(38 92% 50%)",
    tokens: {
      primary: "38 92% 50%",
      accent: "38 80% 45%",
      ring: "38 92% 50%",
    },
  },
  purple: {
    label: "Purple",
    swatch: "hsl(262 83% 58%)",
    tokens: {
      primary: "262 83% 58%",
      accent: "262 70% 52%",
      ring: "262 83% 58%",
    },
  },
  red: {
    label: "Red",
    swatch: "hsl(0 84% 60%)",
    tokens: {
      primary: "0 84% 60%",
      accent: "0 72% 55%",
      ring: "0 84% 60%",
    },
  },
};

export function isAccentPaletteKey(value: unknown): value is AccentPaletteKey {
  return typeof value === "string" && (ACCENT_PALETTE_KEYS as readonly string[]).includes(value);
}

