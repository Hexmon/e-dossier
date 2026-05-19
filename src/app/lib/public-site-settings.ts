import { DEFAULT_PLATOON_THEME_COLOR, normalizePlatoonThemeColor } from "@/lib/platoon-theme";

export type PublicCommander = {
  id: string;
  name: string;
  designation: string;
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
  incidentDate: string;
  description: string;
};

export type PublicEventNews = {
  id: string;
  date: string;
  title: string;
  description: string;
  location: string;
  type: "event" | "news";
};

export type PublicFooter = {
  footer: string;
};

export type PublicPlatoon = {
  id: string;
  key: string;
  name: string;
  about: string | null;
  themeColor: string;
  imageUrl: string | null;
};

export type PublicSiteSettings = {
  logoUrl: string | null;
  heroBgUrl: string | null;
  heroTitle: string;
  heroDescription: string;
  commandersSectionTitle: string;
  awardsSectionTitle: string;
  historySectionTitle: string;
};

export const FALLBACK_PUBLIC_SITE_SETTINGS: PublicSiteSettings = {
  logoUrl: null,
  heroBgUrl: null,
  heroTitle: "MCEME",
  heroDescription:
    "Training Excellence for Officer Cadets (OCs) at the Military College of Electronics & Mechanical Engineering",
  commandersSectionTitle: "Commander's Corner",
  awardsSectionTitle: "Gallantry Awards",
  historySectionTitle: "Our History",
};

export const FALLBACK_PUBLIC_FOOTER =
  "For official MCEME internal use only. (c) 2025 Military College of Electronics & Mechanical Engineering";

export function normalizePublicSiteSettings(input: Partial<PublicSiteSettings> | null | undefined) {
  return {
    logoUrl: input?.logoUrl ?? FALLBACK_PUBLIC_SITE_SETTINGS.logoUrl,
    heroBgUrl: input?.heroBgUrl ?? FALLBACK_PUBLIC_SITE_SETTINGS.heroBgUrl,
    heroTitle: input?.heroTitle || FALLBACK_PUBLIC_SITE_SETTINGS.heroTitle,
    heroDescription: input?.heroDescription || FALLBACK_PUBLIC_SITE_SETTINGS.heroDescription,
    commandersSectionTitle:
      input?.commandersSectionTitle || FALLBACK_PUBLIC_SITE_SETTINGS.commandersSectionTitle,
    awardsSectionTitle: input?.awardsSectionTitle || FALLBACK_PUBLIC_SITE_SETTINGS.awardsSectionTitle,
    historySectionTitle: input?.historySectionTitle || FALLBACK_PUBLIC_SITE_SETTINGS.historySectionTitle,
  };
}

async function withFallback<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch {
    return fallback;
  }
}

export async function fetchLandingSiteSettings() {
  const [siteQueries, platoonQueries] = await Promise.all([
    import("@/app/db/queries/site-settings"),
    import("@/app/db/queries/public-platoons"),
  ]);

  const [settings, commanders, awards, history, eventsNews, footerItem, platoons] = await Promise.all([
    withFallback(() => siteQueries.getSiteSettingsOrDefault(), FALLBACK_PUBLIC_SITE_SETTINGS),
    withFallback(() => siteQueries.listPublicCommandersForDisplay(), []),
    withFallback(() => siteQueries.listPublicAwards(), []),
    withFallback(() => siteQueries.listPublicHistory("asc"), []),
    withFallback(() => siteQueries.listPublicEventsNews("desc"), []),
    withFallback(() => siteQueries.getPublicFooter(), null),
    withFallback(() => platoonQueries.listPublicPlatoonsForLanding(), []),
  ]);

  return {
    settings: normalizePublicSiteSettings(settings),
    commanders: commanders.map((item) => ({
      id: item.id,
      name: item.name,
      designation: item.designation,
      imageUrl: item.displayImageUrl ?? item.imageUrl,
      tenure: item.tenure,
      description: item.description,
      sortOrder: item.sortOrder,
    })),
    awards: awards.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      imageUrl: item.imageUrl,
      sortOrder: item.sortOrder,
    })),
    history: history.map((item) => ({
      id: item.id,
      incidentDate: item.incidentDate,
      description: item.description,
    })),
    eventsNews: eventsNews.map((item) => ({
      id: item.id,
      date: item.date,
      title: item.title,
      description: item.description,
      location: item.location,
      type: (item.type === "news" ? "news" : "event") as PublicEventNews["type"],
    })),
    footer: footerItem?.footer?.trim() || FALLBACK_PUBLIC_FOOTER,
    platoons: platoons.map((item) => ({
      id: item.id,
      key: item.key,
      name: item.name,
      about: item.about,
      themeColor: normalizePlatoonThemeColor(item.themeColor ?? DEFAULT_PLATOON_THEME_COLOR),
      imageUrl: item.imageUrl ?? null,
    })),
  };
}
