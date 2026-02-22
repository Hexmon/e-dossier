export type PublicPlatoon = {
  id: string;
  key: string;
  name: string;
  about: string | null;
  themeColor: string;
  imageUrl: string | null;
};

export type PublicPlatoonCommanderHistoryItem = {
  appointmentId: string;
  name: string;
  rank: string;
  assignment: "PRIMARY" | "OFFICIATING";
  startsAt: string;
  endsAt: string | null;
  status: "CURRENT" | "PREVIOUS";
};

export type PublicPlatoonCommanderHistoryPayload = {
  platoon: PublicPlatoon;
  items: PublicPlatoonCommanderHistoryItem[];
};

export type PublicSiteHeaderSettings = {
  logoUrl: string | null;
  siteTitle: string;
};

function getPublicOrigin() {
  return process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";
}

async function fetchPublicJson<T>(path: string): Promise<T | null> {
  try {
    const url = new URL(path, getPublicOrigin()).toString();
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchPublicPlatoon(idOrKey: string): Promise<PublicPlatoon | null> {
  if (!idOrKey.trim()) return null;
  const encoded = encodeURIComponent(idOrKey.trim());
  const payload = await fetchPublicJson<{ platoon?: PublicPlatoon }>(`/api/v1/platoons/${encoded}`);
  return payload?.platoon ?? null;
}

export async function fetchPublicPlatoonCommanderHistory(
  idOrKey: string,
): Promise<PublicPlatoonCommanderHistoryPayload | null> {
  if (!idOrKey.trim()) return null;
  const encoded = encodeURIComponent(idOrKey.trim());
  const payload = await fetchPublicJson<PublicPlatoonCommanderHistoryPayload>(
    `/api/v1/platoons/${encoded}/commander-history`,
  );
  if (!payload?.platoon) return null;
  return {
    platoon: payload.platoon,
    items: payload.items ?? [],
  };
}

export async function fetchPublicSiteHeaderSettings(): Promise<PublicSiteHeaderSettings> {
  const payload = await fetchPublicJson<{
    settings?: {
      logoUrl?: string | null;
      heroTitle?: string | null;
    };
  }>("/api/v1/site-settings");

  return {
    logoUrl: payload?.settings?.logoUrl ?? null,
    siteTitle: payload?.settings?.heroTitle?.trim() || "MCEME",
  };
}
