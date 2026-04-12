import { describe, expect, it } from "vitest";

import {
  INTERVIEW_WRITE_PERMISSIONS,
  canEditInitialInterviewOfficer,
  canEditTermField,
  getRequiredPermissionsForInterviewMutation,
  isTermIdentityField,
  resolveInterviewFallbackPermissionKeys,
  resolveInterviewAccessContext,
} from "@/lib/interview-access";

describe("interview access mapping", () => {
  it("builds permission-backed interview access context", () => {
    const context = resolveInterviewAccessContext({
      permissions: [INTERVIEW_WRITE_PERMISSIONS.initial.plcdr, null, "  "],
      deniedPermissions: [INTERVIEW_WRITE_PERMISSIONS.term.special],
    });

    expect(context.permissions.has(INTERVIEW_WRITE_PERMISSIONS.initial.plcdr)).toBe(true);
    expect(context.deniedPermissions.has(INTERVIEW_WRITE_PERMISSIONS.term.special)).toBe(true);
  });

  it("falls back to role and position mappings when explicit permissions are absent", () => {
    const context = resolveInterviewAccessContext({
      roles: ["PLATOON_COMMANDER_EQUIVALENT"],
      position: "PTN_CDR",
    });

    expect(context.permissions.has(INTERVIEW_WRITE_PERMISSIONS.initial.plcdr)).toBe(true);
    expect(context.permissions.has(INTERVIEW_WRITE_PERMISSIONS.term.postmid)).toBe(true);
  });

  it("recognizes platoon-specific PL CDR authority keys for fallback interview permissions", () => {
    expect(
      resolveInterviewFallbackPermissionKeys({
        roles: ["ARJUNPLCDR"],
        position: "ARJUNPLCDR",
        scopeType: "PLATOON",
      }),
    ).toEqual(
      expect.arrayContaining([
        INTERVIEW_WRITE_PERMISSIONS.initial.plcdr,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.shared,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.plcdr,
        INTERVIEW_WRITE_PERMISSIONS.term.postmid,
        INTERVIEW_WRITE_PERMISSIONS.term.special,
      ]),
    );
  });

  it("grants initial interview edit access only when the matching permission is present", () => {
    const dscoord = resolveInterviewAccessContext({
      permissions: [INTERVIEW_WRITE_PERMISSIONS.initial.dscoord],
    });

    expect(canEditInitialInterviewOfficer(dscoord, "dscoord")).toBe(true);
    expect(canEditInitialInterviewOfficer(dscoord, "plcdr")).toBe(false);
  });

  it("limits term field editing by permission ownership while leaving shared fields with plcdr", () => {
    const plcdr = resolveInterviewAccessContext({
      permissions: [
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.shared,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.plcdr,
      ],
    });
    const dycdr = resolveInterviewAccessContext({
      permissions: [INTERVIEW_WRITE_PERMISSIONS.term.beginning.dycdr],
    });

    const sharedField = { key: "strengths", label: "Strengths" };
    const dycdrField = { key: "remarks2", label: "DY CDR Remarks" };
    const cdrNameField = { key: "remarksName3", label: "CDR Signature", fieldType: "text", captureSignature: false };

    expect(canEditTermField(plcdr, "beginning", sharedField)).toBe(true);
    expect(canEditTermField(dycdr, "beginning", sharedField)).toBe(false);
    expect(canEditTermField(dycdr, "beginning", dycdrField)).toBe(true);
    expect(canEditTermField(plcdr, "beginning", dycdrField)).toBe(false);
    expect(isTermIdentityField(cdrNameField, "beginning")).toBe(true);
  });

  it("keeps special interview records editable through the dedicated special permission", () => {
    const specialEditor = resolveInterviewAccessContext({
      permissions: [INTERVIEW_WRITE_PERMISSIONS.term.special],
    });

    expect(canEditTermField(specialEditor, "special", { key: "summary", label: "Summary" })).toBe(true);
  });

  it("resolves required mutation permissions from template scope and requested fields", () => {
    expect(
      getRequiredPermissionsForInterviewMutation({
        template: { code: "DYCDR_INITIAL", title: "DY CDR Initial Interview" },
        fields: [{ key: "interviewedBy", label: "Interviewed By", groupId: null }],
      }),
    ).toEqual([INTERVIEW_WRITE_PERMISSIONS.initial.dycdr]);

    expect(
      getRequiredPermissionsForInterviewMutation({
        template: { code: "BEGINNING_TERM", title: "Beginning of Term" },
        fields: [
          { key: "strengths", label: "Strengths", groupId: null },
          { key: "remarks2", label: "DY CDR Remarks", groupId: null },
        ],
      }),
    ).toEqual([
      INTERVIEW_WRITE_PERMISSIONS.term.beginning.dycdr,
      INTERVIEW_WRITE_PERMISSIONS.term.beginning.shared,
    ]);
  });
});
