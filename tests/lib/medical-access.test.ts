import { describe, expect, it } from "vitest";

import { canWriteMedicalRecords } from "@/lib/medical-access";

describe("canWriteMedicalRecords", () => {
  it("allows super admin regardless of scope", () => {
    expect(
      canWriteMedicalRecords({
        roles: ["SUPER_ADMIN"],
        position: "SUPER_ADMIN",
        scopeType: "GLOBAL",
      })
    ).toBe(true);
  });

  it("allows commander-equivalent authority only at platoon scope", () => {
    expect(
      canWriteMedicalRecords({
        roles: ["PLATOON_COMMANDER_EQUIVALENT"],
        position: "arjunplcdr",
        scopeType: "PLATOON",
      })
    ).toBe(true);
    expect(
      canWriteMedicalRecords({
        roles: ["PLATOON_COMMANDER_EQUIVALENT"],
        position: "arjunplcdr",
        scopeType: "GLOBAL",
      })
    ).toBe(false);
  });

  it("rejects non-commander, non-super-admin writers", () => {
    expect(
      canWriteMedicalRecords({
        roles: ["ADMIN"],
        position: "ADMIN",
        scopeType: "GLOBAL",
      })
    ).toBe(false);
  });
});
