import { describe, expect, it } from "vitest";

import { deriveSetupStatus, type SetupStatusCounts } from "@/app/lib/setup-status";

function makeCounts(overrides: Partial<SetupStatusCounts> = {}): SetupStatusCounts {
  return {
    activeSuperAdmins: 0,
    activePlatoons: 0,
    activeCourses: 0,
    activeOfferings: 0,
    activeOCs: 0,
    activeHierarchyNodes: 1,
    activeRootNodes: 1,
    missingPlatoonHierarchyNodes: 0,
    ...overrides,
  };
}

describe("setup status derivation", () => {
  it("marks a fresh install as bootstrap-required with later steps blocked", () => {
    const setup = deriveSetupStatus(makeCounts());

    expect(setup.bootstrapRequired).toBe(true);
    expect(setup.setupComplete).toBe(false);
    expect(setup.nextStep).toBe("superAdmin");
    expect(setup.steps.superAdmin.status).toBe("pending");
    expect(setup.steps.platoons.status).toBe("blocked");
    expect(setup.steps.hierarchy.status).toBe("blocked");
  });

  it("marks bootstrap complete but later setup pending when only a super admin exists", () => {
    const setup = deriveSetupStatus(
      makeCounts({
        activeSuperAdmins: 1,
      })
    );

    expect(setup.bootstrapRequired).toBe(false);
    expect(setup.steps.superAdmin.status).toBe("complete");
    expect(setup.steps.platoons.status).toBe("pending");
    expect(setup.steps.hierarchy.status).toBe("blocked");
    expect(setup.nextStep).toBe("platoons");
  });

  it("marks a partially configured system with offerings pending when hierarchy and courses exist", () => {
    const setup = deriveSetupStatus(
      makeCounts({
        activeSuperAdmins: 1,
        activePlatoons: 2,
        activeHierarchyNodes: 3,
        missingPlatoonHierarchyNodes: 0,
        activeCourses: 1,
      })
    );

    expect(setup.steps.platoons.status).toBe("complete");
    expect(setup.steps.hierarchy.status).toBe("complete");
    expect(setup.steps.courses.status).toBe("complete");
    expect(setup.steps.offerings.status).toBe("pending");
    expect(setup.steps.ocs.status).toBe("blocked");
    expect(setup.nextStep).toBe("offerings");
  });

  it("marks setup complete when all required foundations exist", () => {
    const setup = deriveSetupStatus(
      makeCounts({
        activeSuperAdmins: 1,
        activePlatoons: 2,
        activeCourses: 1,
        activeOfferings: 3,
        activeOCs: 10,
        activeHierarchyNodes: 3,
        missingPlatoonHierarchyNodes: 0,
      })
    );

    expect(setup.setupComplete).toBe(true);
    expect(setup.nextStep).toBeNull();
    expect(
      Object.values(setup.steps).every((step) => step.status === "complete")
    ).toBe(true);
  });
});
