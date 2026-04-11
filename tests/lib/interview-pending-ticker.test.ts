import { describe, expect, it } from "vitest";

import {
  canAccessInterviewPendingTickerSetting,
  isPlatoonCommanderDashboardUser,
} from "@/lib/interview-pending-ticker";

describe("interview pending ticker access", () => {
  it("allows platoon-scoped commander-equivalent users", () => {
    expect(
      canAccessInterviewPendingTickerSetting({
        roles: ["arjunplcdr"],
        position: "arjunplcdr",
        scopeType: "PLATOON",
      })
    ).toBe(true);
  });

  it("treats platoon-scoped dashboard users as eligible even without normalized commander tokens", () => {
    expect(
      isPlatoonCommanderDashboardUser({
        roles: ["some_plcdr_role"],
        position: "some_plcdr_role",
        scopeType: "PLATOON",
      })
    ).toBe(true);
  });

  it("keeps global non-admin users blocked", () => {
    expect(
      canAccessInterviewPendingTickerSetting({
        roles: ["TRAINING_OFFICER"],
        position: "TRAINING_OFFICER",
        scopeType: "GLOBAL",
      })
    ).toBe(false);
  });
});
