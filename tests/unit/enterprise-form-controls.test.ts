import { describe, expect, it } from "vitest";

import {
  formatIndiaPhoneForDisplay,
  normalizeIndiaPhoneDigits,
} from "@/app/lib/forms/phone";
import {
  activeUserCreateRequiresPassword,
  activationRequiresPassword,
  passwordConfirmationError,
} from "@/app/lib/users/credential-policy";
import { DEFAULT_APPOINTMENT_TEMPLATE_POSITIONS } from "@/app/lib/bootstrap/appointment-template-view";

describe("enterprise form control helpers", () => {
  it("normalizes Indian phone inputs to digits only without storing +91", () => {
    expect(normalizeIndiaPhoneDigits("+91 98765 43210")).toBe("9876543210");
    expect(normalizeIndiaPhoneDigits("98765-43210")).toBe("9876543210");
    expect(normalizeIndiaPhoneDigits("abc98765")).toBe("98765");
  });

  it("formats Indian phone values with the default +91 display prefix", () => {
    expect(formatIndiaPhoneForDisplay("9876543210")).toBe("+91 9876543210");
    expect(formatIndiaPhoneForDisplay("")).toBe("+91");
  });

  it("requires an initial password for active user creation", () => {
    expect(activeUserCreateRequiresPassword({ isActive: true, password: "" })).toBe(true);
    expect(activeUserCreateRequiresPassword({ isActive: undefined, password: "" })).toBe(true);
    expect(activeUserCreateRequiresPassword({ isActive: false, password: "" })).toBe(false);
    expect(activeUserCreateRequiresPassword({ isActive: true, password: "Password1" })).toBe(false);
  });

  it("requires a password when activating a user without credentials", () => {
    expect(activationRequiresPassword({ nextIsActive: true, hasCredential: false, password: "" })).toBe(true);
    expect(activationRequiresPassword({ nextIsActive: true, hasCredential: true, password: "" })).toBe(false);
    expect(activationRequiresPassword({ nextIsActive: true, hasCredential: false, password: "Password1" })).toBe(false);
    expect(activationRequiresPassword({ nextIsActive: false, hasCredential: false, password: "" })).toBe(false);
  });

  it("blocks mismatched password confirmation", () => {
    expect(passwordConfirmationError({ password: "Password1", confirmPassword: "Password2" })).toBe("Passwords do not match.");
    expect(passwordConfirmationError({ password: "Password1", confirmPassword: "Password1" })).toBeNull();
    expect(passwordConfirmationError({ password: "", confirmPassword: "" })).toBeNull();
  });

  it("exposes the default appointment template position summary", () => {
    expect(DEFAULT_APPOINTMENT_TEMPLATE_POSITIONS).toEqual(
      expect.arrayContaining([
        { key: "COMDT", displayName: "Comdt", defaultScope: "GLOBAL" },
        { key: "PTN_CDR", displayName: "Ptn_cdr", defaultScope: "PLATOON" },
      ])
    );
  });
});
