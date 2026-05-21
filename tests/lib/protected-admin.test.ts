import { describe, expect, it } from "vitest";

import {
  getAppointmentManagementPolicy,
  getProtectedAdminPositionKey,
  getUserManagementProtectionReason,
} from "@/lib/protected-admin";

describe("protected admin helpers", () => {
  it("normalizes protected position keys", () => {
    expect(getProtectedAdminPositionKey("admin")).toBe("ADMIN");
    expect(getProtectedAdminPositionKey(" SUPER_ADMIN ")).toBe("SUPER_ADMIN");
    expect(getProtectedAdminPositionKey("PTN_CDR")).toBeNull();
  });

  it("detects users holding protected appointments", () => {
    expect(
      getUserManagementProtectionReason({
        activeAppointments: [{ positionKey: "ADMIN" }],
      }),
    ).toBe("Protected ADMIN/SUPER_ADMIN users cannot be edited or deleted from User Management.");

    expect(
      getUserManagementProtectionReason({
        activeAppointments: [{ positionKey: "PTN_CDR" }],
      }),
    ).toBeNull();
  });

  it("blocks ADMIN appointment edit/delete and allows handover only for SUPER_ADMIN actors", () => {
    expect(
      getAppointmentManagementPolicy(
        { positionKey: "ADMIN" },
        { actorIsSuperAdmin: false },
      ),
    ).toMatchObject({
      canHandover: false,
      canEdit: false,
      canDelete: false,
      handoverReason: "Only SUPER_ADMIN can hand over ADMIN appointment.",
    });

    expect(
      getAppointmentManagementPolicy(
        { positionKey: "ADMIN" },
        { actorIsSuperAdmin: true },
      ),
    ).toMatchObject({
      canHandover: true,
      canEdit: false,
      canDelete: false,
    });
  });

  it("blocks SUPER_ADMIN appointment handover, edit, and delete for every actor", () => {
    expect(
      getAppointmentManagementPolicy(
        { positionKey: "SUPER_ADMIN" },
        { actorIsSuperAdmin: true },
      ),
    ).toMatchObject({
      canHandover: false,
      canEdit: false,
      canDelete: false,
      handoverReason: "SUPER_ADMIN appointment cannot be handed over.",
    });
  });
});
