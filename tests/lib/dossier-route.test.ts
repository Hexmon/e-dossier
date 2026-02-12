import { describe, expect, it } from "vitest";
import {
  buildCurrentDossierRoot,
  buildDossierPathForOc,
  extractDossierContext,
  isDossierManagementRoute,
} from "@/lib/dossier-route";

describe("isDossierManagementRoute", () => {
  it("returns true for dossier root", () => {
    expect(isDossierManagementRoute("/dashboard/oc-1/milmgmt")).toBe(true);
  });

  it("returns true for dossier sub-routes", () => {
    expect(isDossierManagementRoute("/dashboard/oc-1/milmgmt/performance-graph")).toBe(true);
  });

  it("returns false for non-dossier routes", () => {
    expect(isDossierManagementRoute("/dashboard")).toBe(false);
    expect(isDossierManagementRoute("/dashboard/genmgmt")).toBe(false);
  });
});

describe("extractDossierContext", () => {
  it("extracts oc id and empty tail for root", () => {
    expect(extractDossierContext("/dashboard/oc-1/milmgmt")).toEqual({
      ocId: "oc-1",
      tailPath: "",
    });
  });

  it("extracts oc id and tail for sub-route", () => {
    expect(extractDossierContext("/dashboard/oc-1/milmgmt/performance-graph")).toEqual({
      ocId: "oc-1",
      tailPath: "/performance-graph",
    });
  });

  it("returns null for non-dossier paths", () => {
    expect(extractDossierContext("/dashboard/manage-marks")).toBeNull();
  });
});

describe("buildDossierPathForOc", () => {
  it("preserves dossier subpath and query string", () => {
    expect(
      buildDossierPathForOc(
        "oc-2",
        "/dashboard/oc-1/milmgmt/performance-graph",
        "tab=mil-trg"
      )
    ).toBe("/dashboard/oc-2/milmgmt/performance-graph?tab=mil-trg");
  });

  it("falls back to dossier root when current route is not dossier", () => {
    expect(buildDossierPathForOc("oc-2", "/dashboard/reports", "")).toBe("/dashboard/oc-2/milmgmt");
  });
});

describe("buildCurrentDossierRoot", () => {
  it("returns dossier root from dossier routes", () => {
    expect(buildCurrentDossierRoot("/dashboard/oc-1/milmgmt/performance-graph")).toBe(
      "/dashboard/oc-1/milmgmt"
    );
  });

  it("returns null for non-dossier routes", () => {
    expect(buildCurrentDossierRoot("/dashboard")).toBeNull();
  });
});
