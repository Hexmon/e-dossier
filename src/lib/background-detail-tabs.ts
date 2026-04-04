export const BACKGROUND_DETAIL_TAB_KEY = "bgTab" as const;
export const DEFAULT_BACKGROUND_DETAIL_TAB = "family-bgrnd" as const;

export const BACKGROUND_DETAIL_TABS = [
  "family-bgrnd",
  "edn-qlf",
  "achievements",
  "auto-bio",
] as const;

export type BackgroundDetailTab = (typeof BACKGROUND_DETAIL_TABS)[number];

type SearchParamsLike = {
  get(name: string): string | null;
  toString(): string;
};

export function isBackgroundDetailTab(value: string | null | undefined): value is BackgroundDetailTab {
  return BACKGROUND_DETAIL_TABS.includes(value as BackgroundDetailTab);
}

export function resolveBackgroundDetailTab(searchParams: SearchParamsLike) {
  const bgTab = searchParams.get(BACKGROUND_DETAIL_TAB_KEY);
  if (isBackgroundDetailTab(bgTab)) {
    return {
      activeTab: bgTab,
      shouldCanonicalize: false,
    };
  }

  const legacyTab = searchParams.get("tab");
  if (isBackgroundDetailTab(legacyTab)) {
    return {
      activeTab: legacyTab,
      shouldCanonicalize: true,
    };
  }

  return {
    activeTab: DEFAULT_BACKGROUND_DETAIL_TAB,
    shouldCanonicalize: false,
  };
}

export function buildBackgroundDetailSearchParams(
  searchParams: SearchParamsLike,
  activeTab: BackgroundDetailTab
) {
  const params = new URLSearchParams(searchParams.toString());
  params.set("tab", "basic-details");
  params.set(BACKGROUND_DETAIL_TAB_KEY, activeTab);
  return params;
}
