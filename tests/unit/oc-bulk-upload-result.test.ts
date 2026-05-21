import { describe, expect, it } from "vitest";

import { buildOCBulkUploadToast } from "@/app/lib/oc/bulk-upload-result";

describe("OC bulk upload toast result", () => {
  it("shows a success toast only when every selected row uploads", () => {
    expect(buildOCBulkUploadToast({ success: 3, failed: 0, errors: [] })).toEqual({
      variant: "success",
      message: "Bulk upload completed: 3 OCs uploaded.",
    });
  });

  it("shows an error toast for partial upload results", () => {
    const toast = buildOCBulkUploadToast({
      success: 2,
      failed: 1,
      errors: [{ row: 3, error: "Duplicate TES No" }],
    });

    expect(toast?.variant).toBe("error");
    expect(toast?.message).toContain("partially completed");
    expect(toast?.message).toContain("2 OCs uploaded");
    expect(toast?.message).toContain("1 row failed");
  });

  it("shows an error toast when every selected row fails", () => {
    expect(buildOCBulkUploadToast({ success: 0, failed: 2, errors: [] })).toEqual({
      variant: "error",
      message: "Bulk upload failed: 2 rows failed. Review errors in the upload review.",
    });
  });

  it("does not show a toast when no upload was attempted", () => {
    expect(buildOCBulkUploadToast(null)).toBeNull();
    expect(buildOCBulkUploadToast(undefined)).toBeNull();
  });
});
