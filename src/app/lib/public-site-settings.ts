export type PublicCommander = {
  id: string;
  name: string;
  imageUrl: string | null;
  tenure: string;
  description: string;
  sortOrder: number;
};

export type PublicAward = {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string | null;
  sortOrder: number;
};

export type PublicHistory = {
  id: string;
  yearOrDate: string;
  description: string;
};

export type PublicPlatoon = {
  id: string;
  key: string;
  name: string;
  about: string | null;
};

export type PublicSiteSettings = {
  logoUrl: string | null;
  heroTitle: string;
  heroDescription: string;
  commandersSectionTitle: string;
  awardsSectionTitle: string;
  historySectionTitle: string;
};

export const FALLBACK_PUBLIC_SITE_SETTINGS: PublicSiteSettings = {
  logoUrl: null,
  heroTitle: "MCEME",
  heroDescription:
    "Training Excellence for Officer Cadets (OCs) at the Military College of Electronics & Mechanical Engineering",
  commandersSectionTitle: "Commander's Corner",
  awardsSectionTitle: "Gallantry Awards",
  historySectionTitle: "Our History",
};

export function normalizePublicSiteSettings(input: Partial<PublicSiteSettings> | null | undefined) {
  return {
    logoUrl: input?.logoUrl ?? FALLBACK_PUBLIC_SITE_SETTINGS.logoUrl,
    heroTitle: input?.heroTitle || FALLBACK_PUBLIC_SITE_SETTINGS.heroTitle,
    heroDescription: input?.heroDescription || FALLBACK_PUBLIC_SITE_SETTINGS.heroDescription,
    commandersSectionTitle:
      input?.commandersSectionTitle || FALLBACK_PUBLIC_SITE_SETTINGS.commandersSectionTitle,
    awardsSectionTitle: input?.awardsSectionTitle || FALLBACK_PUBLIC_SITE_SETTINGS.awardsSectionTitle,
    historySectionTitle: input?.historySectionTitle || FALLBACK_PUBLIC_SITE_SETTINGS.historySectionTitle,
  };
}

async function fetchPublicJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const origin =
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      process.env.APP_BASE_URL ??
      "http://localhost:3000";
    const url = new URL(path, origin).toString();

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return fallback;
    }

    const payload = await response.json();
    return payload as T;
  } catch {
    return fallback;
  }
}

export async function fetchLandingSiteSettings() {
  const [settingsRes, commandersRes, awardsRes, historyRes, platoonsRes] = await Promise.all([
    fetchPublicJson<{ settings?: PublicSiteSettings }>("/api/v1/site-settings", {}),
    fetchPublicJson<{ items?: PublicCommander[] }>("/api/v1/site-settings/commanders", {}),
    fetchPublicJson<{ items?: PublicAward[] }>("/api/v1/site-settings/awards", {}),
    fetchPublicJson<{ items?: PublicHistory[] }>("/api/v1/site-settings/history?sort=asc", {}),
    fetchPublicJson<{ items?: PublicPlatoon[] }>("/api/v1/platoons", {}),
  ]);

  return {
    settings: normalizePublicSiteSettings(settingsRes.settings),
    commanders: commandersRes.items ?? [],
    awards: awardsRes.items ?? [],
    history: historyRes.items ?? [],
    platoons: platoonsRes.items ?? [],
  };
}
