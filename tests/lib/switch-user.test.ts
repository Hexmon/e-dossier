import { describe, expect, it } from "vitest";
import {
  buildSwitchableAppointmentLabel,
  filterSavedAccounts,
  filterSwitchableAppointments,
  filterUserTypes,
  isSameIdentity,
  mergeSwitchableAppointments,
  normalizeLoginAppointmentForSwitching,
} from "@/lib/switch-user";

describe("switch-user helpers", () => {
  it("filterUserTypes excludes current type", () => {
    const types = [
      { key: "SUPER_ADMIN", label: "Super Admin" },
      { key: "ADMIN", label: "Admin" },
      { key: "PLATOON_COMMANDER", label: "Platoon Commander" },
    ];

    const result = filterUserTypes(types, "ADMIN");
    expect(result.map((item) => item.key)).toEqual([
      "SUPER_ADMIN",
      "PLATOON_COMMANDER",
    ]);
  });

  it("filterSavedAccounts excludes the active account", () => {
    const accounts = [
      { userId: "user-a", appointmentId: "apt-a", roleKey: "ADMIN", username: "admin_a" },
      { userId: "user-a", appointmentId: "apt-b", roleKey: "TRAINING_OFFICER", username: "admin_a" },
      { userId: "user-b", appointmentId: "apt-d", roleKey: "SUPER_ADMIN" },
      { userId: "user-c", appointmentId: "apt-c", roleKey: "PLATOON_COMMANDER" },
    ];

    const result = filterSavedAccounts(accounts, {
      userId: "user-a",
      appointmentId: "apt-a",
      roleKey: "ADMIN",
    });

    expect(result.map((item) => item.appointmentId)).toEqual(["apt-b", "apt-d", "apt-c"]);
  });

  it("filterSwitchableAppointments excludes only the active authority", () => {
    const appointments = [
      {
        id: "apt-active",
        userId: "user-active",
        username: "admin_user",
        positionKey: "ADMIN",
        positionName: "Admin",
      },
      {
        id: "apt-same-user-other-role",
        userId: "user-active",
        username: "admin_user",
        positionKey: "TRAINING_OFFICER",
        positionName: "Training Officer",
      },
      {
        id: "apt-super",
        userId: "user-super",
        username: "super_user",
        positionKey: "SUPER_ADMIN",
        positionName: "Super Admin",
      },
    ];

    const result = filterSwitchableAppointments(appointments, {
      userId: "user-active",
      appointmentId: "apt-active",
      roleKey: "ADMIN",
      username: "admin_user",
    });

    expect(result.map((item) => item.id)).toEqual(["apt-same-user-other-role", "apt-super"]);
  });

  it("isSameIdentity distinguishes multiple authorities for the same user", () => {
    const previous = {
      userId: "user-123",
      appointmentId: "apt-123",
      roleKey: "ADMIN",
      username: "admin_user",
    };

    const next = {
      userId: "user-123",
      appointmentId: "apt-999",
      roleKey: "TRAINING_OFFICER",
      username: "admin_user",
    };

    expect(isSameIdentity(previous, next)).toBe(false);
  });

  it("isSameIdentity matches the same delegation authority", () => {
    const previous = {
      userId: "user-123",
      appointmentId: "apt-123",
      delegationId: "del-123",
      roleKey: "TRAINING_OFFICER",
      username: "delegate_user",
    };

    const next = {
      userId: "user-123",
      appointmentId: "apt-999",
      delegationId: "del-123",
      roleKey: "TRAINING_OFFICER",
      username: "delegate_user",
    };

    expect(isSameIdentity(previous, next)).toBe(true);
  });

  it("normalizes login appointments into switchable appointment options", () => {
    const result = normalizeLoginAppointmentForSwitching({
      id: "apt-1",
      username: "admin_user",
      positionKey: "ADMIN",
      positionName: "Admin",
      scopeType: "GLOBAL",
      scopeId: null,
      platoonName: null,
    });

    expect(result).toMatchObject({
      kind: "APPOINTMENT",
      id: "apt-1",
      username: "admin_user",
      appointmentId: "apt-1",
      delegationId: null,
      label: "Admin",
    });
  });

  it("merges login appointments with switchable delegation identities without dropping delegations", () => {
    const result = mergeSwitchableAppointments(
      [
        {
          id: "apt-1",
          username: "admin_user",
          positionKey: "ADMIN",
          positionName: "Admin",
          scopeType: "GLOBAL",
          scopeId: null,
          platoonName: null,
        },
      ],
      [
        {
          kind: "DELEGATION" as const,
          id: "del-1",
          userId: "user-1",
          username: "admin_user",
          positionKey: "PLATOON_COMMANDER",
          positionName: "Platoon Commander",
          scopeType: "PLATOON",
          scopeId: "platoon-1",
          platoonName: "Alpha Platoon",
          grantorLabel: "grantor_user",
          appointmentId: "apt-2",
          delegationId: "del-1",
          label: "Platoon Commander • Alpha Platoon • Acting for grantor_user",
        },
      ]
    );

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.id)).toEqual(["apt-1", "del-1"]);
  });

  it("filterSwitchableAppointments excludes the active delegation when current delegation id is present", () => {
    const result = filterSwitchableAppointments(
      [
        {
          kind: "DELEGATION" as const,
          id: "del-active",
          userId: "user-1",
          username: "delegate_user",
          positionKey: "PLATOON_COMMANDER",
          delegationId: "del-active",
          appointmentId: "apt-grantor",
        },
        {
          kind: "APPOINTMENT" as const,
          id: "apt-other",
          userId: null,
          username: "admin_user",
          positionKey: "ADMIN",
          appointmentId: "apt-other",
          delegationId: null,
        },
      ],
      {
        userId: "user-1",
        appointmentId: "apt-grantor",
        delegationId: "del-active",
        roleKey: "PLATOON_COMMANDER",
        username: "delegate_user",
      }
    );

    expect(result.map((item) => item.id)).toEqual(["apt-other"]);
  });

  it("builds switchable labels consistently for appointments and delegations", () => {
    expect(
      buildSwitchableAppointmentLabel({
        positionName: "Admin",
        positionKey: "ADMIN",
        platoonName: null,
        kind: "APPOINTMENT",
        grantorLabel: null,
      })
    ).toBe("Admin");

    expect(
      buildSwitchableAppointmentLabel({
        positionName: "Platoon Commander",
        positionKey: "PLATOON_COMMANDER",
        platoonName: "Alpha Platoon",
        kind: "DELEGATION",
        grantorLabel: "grantor_user",
      })
    ).toBe("Platoon Commander • Alpha Platoon • Acting for grantor_user");
  });
});
