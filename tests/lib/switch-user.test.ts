import { describe, expect, it } from "vitest";
import {
  filterSavedAccounts,
  filterSwitchableAppointments,
  filterUserTypes,
  isSameIdentity,
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
      { userId: "user-a", appointmentId: "apt-a", roleKey: "ADMIN" },
      { userId: "user-b", appointmentId: "apt-b", roleKey: "SUPER_ADMIN" },
      { userId: "user-c", appointmentId: "apt-c", roleKey: "PLATOON_COMMANDER" },
    ];

    const result = filterSavedAccounts(accounts, {
      userId: "user-a",
      appointmentId: "apt-a",
      roleKey: "ADMIN",
    });

    expect(result.map((item) => item.userId)).toEqual(["user-b", "user-c"]);
  });

  it("filterSwitchableAppointments excludes same role and active identity", () => {
    const appointments = [
      {
        id: "apt-active",
        userId: "user-active",
        username: "admin_user",
        positionKey: "ADMIN",
        positionName: "Admin",
      },
      {
        id: "apt-other-admin",
        userId: "user-other-admin",
        username: "admin_2",
        positionKey: "ADMIN",
        positionName: "Admin",
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

    expect(result.map((item) => item.id)).toEqual(["apt-super"]);
  });

  it("isSameIdentity detects same account after relogin", () => {
    const previous = {
      userId: "user-123",
      appointmentId: "apt-123",
      roleKey: "ADMIN",
      username: "admin_user",
    };

    const next = {
      userId: "user-123",
      appointmentId: "apt-999",
      roleKey: "SUPER_ADMIN",
      username: "other_name",
    };

    expect(isSameIdentity(previous, next)).toBe(true);
  });
});
