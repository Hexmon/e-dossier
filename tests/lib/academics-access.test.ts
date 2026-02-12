import { describe, expect, it } from "vitest";
import { canEditAcademics } from "@/lib/academics-access";

describe("canEditAcademics", () => {
  it("allows platoon commander canonical role", () => {
    expect(
      canEditAcademics({ roles: ["PLATOON_COMMANDER"], position: null })
    ).toBe(true);
  });

  it("allows custom platoon commander key ending with plcdr", () => {
    expect(
      canEditAcademics({ roles: ["arjunplcdr"], position: "arjunplcdr" })
    ).toBe(true);
  });

  it("allows admin/super admin/commandant", () => {
    expect(canEditAcademics({ roles: ["ADMIN"], position: null })).toBe(true);
    expect(canEditAcademics({ roles: ["SUPER_ADMIN"], position: null })).toBe(true);
    expect(canEditAcademics({ roles: ["COMMANDANT"], position: null })).toBe(true);
  });

  it("denies other users", () => {
    expect(canEditAcademics({ roles: ["INSTRUCTOR"], position: "INSTRUCTOR" })).toBe(false);
  });
});

