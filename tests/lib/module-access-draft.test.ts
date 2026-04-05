import { describe, expect, it } from "vitest";

import {
  emptyModuleAccessDraft,
  reconcileModuleAccessDraft,
  toModuleAccessDraft,
} from "@/app/lib/module-access-draft";

describe("module access draft helpers", () => {
  it("maps persisted settings into the editable draft shape", () => {
    expect(
      toModuleAccessDraft({
        adminCanAccessDossier: true,
        adminCanAccessBulkUpload: false,
        adminCanAccessReports: true,
      })
    ).toEqual({
      adminCanAccessDossier: true,
      adminCanAccessBulkUpload: false,
      adminCanAccessReports: true,
    });
  });

  it("keeps the current draft when the user has unsaved local edits", () => {
    const currentDraft = {
      adminCanAccessDossier: true,
      adminCanAccessBulkUpload: true,
      adminCanAccessReports: false,
    };

    expect(
      reconcileModuleAccessDraft({
        currentDraft,
        incomingSettings: {
          adminCanAccessDossier: false,
          adminCanAccessBulkUpload: false,
          adminCanAccessReports: false,
        },
        hasLocalEdits: true,
      })
    ).toEqual(currentDraft);
  });

  it("syncs to persisted settings when the draft is clean", () => {
    expect(
      reconcileModuleAccessDraft({
        currentDraft: emptyModuleAccessDraft(),
        incomingSettings: {
          adminCanAccessDossier: false,
          adminCanAccessBulkUpload: true,
          adminCanAccessReports: true,
        },
        hasLocalEdits: false,
      })
    ).toEqual({
      adminCanAccessDossier: false,
      adminCanAccessBulkUpload: true,
      adminCanAccessReports: true,
    });
  });
});
