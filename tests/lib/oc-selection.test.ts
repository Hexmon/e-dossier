import { describe, expect, it } from "vitest";
import { isOcSelectable } from "@/lib/oc-selection";

describe("isOcSelectable", () => {
  it("returns false when oc matches disabled id", () => {
    expect(isOcSelectable("oc-1", "oc-1")).toBe(false);
  });

  it("returns true when oc differs from disabled id", () => {
    expect(isOcSelectable("oc-2", "oc-1")).toBe(true);
  });

  it("returns true when no disabled id is provided", () => {
    expect(isOcSelectable("oc-1", null)).toBe(true);
    expect(isOcSelectable("oc-1", undefined)).toBe(true);
  });
});
