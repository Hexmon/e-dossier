import { describe, expect, it } from "vitest";

import {
  BACKGROUND_DETAIL_TAB_KEY,
  buildBackgroundDetailSearchParams,
  DEFAULT_BACKGROUND_DETAIL_TAB,
  resolveBackgroundDetailTab,
} from "@/lib/background-detail-tabs";

describe("background detail tab helpers", () => {
  it("respects the canonical bgTab query param", () => {
    const result = resolveBackgroundDetailTab(
      new URLSearchParams(`tab=basic-details&${BACKGROUND_DETAIL_TAB_KEY}=achievements`)
    );

    expect(result).toEqual({
      activeTab: "achievements",
      shouldCanonicalize: false,
    });
  });

  it("interprets legacy inner-tab links and requests canonicalization", () => {
    const result = resolveBackgroundDetailTab(new URLSearchParams("tab=family-bgrnd"));

    expect(result).toEqual({
      activeTab: "family-bgrnd",
      shouldCanonicalize: true,
    });
  });

  it("falls back to the default inner tab when no valid background tab is provided", () => {
    const result = resolveBackgroundDetailTab(new URLSearchParams("tab=basic-details"));

    expect(result).toEqual({
      activeTab: DEFAULT_BACKGROUND_DETAIL_TAB,
      shouldCanonicalize: false,
    });
  });

  it("builds canonical query params without losing existing dossier context", () => {
    const params = buildBackgroundDetailSearchParams(
      new URLSearchParams("tab=family-bgrnd&semester=5"),
      "auto-bio"
    );

    expect(params.get("tab")).toBe("basic-details");
    expect(params.get(BACKGROUND_DETAIL_TAB_KEY)).toBe("auto-bio");
    expect(params.get("semester")).toBe("5");
  });
});
