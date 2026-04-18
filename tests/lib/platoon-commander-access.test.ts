import { describe, expect, it } from "vitest";

import {
  canManageCadetAppointments,
  hasPlatoonCommanderRole,
} from "@/lib/platoon-commander-access";

describe("platoon commander access helpers", () => {
  it("keeps canonical commander-role detection strict", () => {
    expect(
      hasPlatoonCommanderRole({
        roles: ["ARJUNPLCDR"],
        position: "ARJUNPLCDR",
      })
    ).toBe(false);
  });

  it("allows cadet appointments for platoon-scoped dynamic plcdr identities", () => {
    expect(
      canManageCadetAppointments({
        roles: ["ARJUNPLCDR"],
        position: "ARJUNPLCDR",
        scopeType: "PLATOON",
      })
    ).toBe(true);
  });

  it("allows cadet appointments for platoon-scoped dynamic platoon-cdr identities", () => {
    expect(
      canManageCadetAppointments({
        roles: ["chandragupt-platoon-cdr"],
        position: "chandragupt-platoon-cdr",
        scopeType: "PLATOON",
      })
    ).toBe(true);
  });

  it("denies cadet appointments when the scope is not platoon", () => {
    expect(
      canManageCadetAppointments({
        roles: ["ARJUNPLCDR"],
        position: "ARJUNPLCDR",
        scopeType: "GLOBAL",
      })
    ).toBe(false);
  });
});
