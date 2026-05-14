import { describe, expect, it } from "vitest";

import {
  getOCBulkRequiredColumnsText,
  toOCBulkPreviewRow,
  validateOCBulkUploadRows,
} from "@/app/lib/oc/bulk-upload-format";

describe("OC bulk upload format validation", () => {
  it("accepts the documented required columns and builds preview rows", () => {
    const validation = validateOCBulkUploadRows([
      {
        "Tes No": "7501",
        Name: "OC Sample",
        Course: "TES-51",
        "Dt of Arrival": "2026-01-10",
        Platoon: "Arjun",
      },
    ]);

    expect(validation.ok).toBe(true);
    if (!validation.ok) return;

    const preview = toOCBulkPreviewRow(validation.nonEmptyRows[0]);
    expect(preview).toMatchObject({
      tesNo: "7501",
      name: "OC Sample",
      course: "TES-51",
      platoon: "Arjun",
      arrival: "10-Jan-2026",
    });
  });

  it("accepts supported header aliases case-insensitively", () => {
    const validation = validateOCBulkUploadRows([
      {
        "OC Number": "7502",
        Name: "OC Alias",
        "Course Code": "TES-51",
        DOA: "2026-02-05",
      },
    ]);

    expect(validation.ok).toBe(true);
    if (!validation.ok) return;

    expect(toOCBulkPreviewRow(validation.nonEmptyRows[0])).toMatchObject({
      tesNo: "7502",
      course: "TES-51",
      arrival: "05-Feb-2026",
    });
  });

  it("rejects files that are missing required headers before preview/upload", () => {
    const validation = validateOCBulkUploadRows([
      {
        "Cadet Name": "Wrong Sheet",
        "Batch": "TES-51",
        "Arrival Date": "2026-01-10",
      },
    ]);

    expect(validation.ok).toBe(false);
    if (validation.ok) return;

    expect(validation.title).toBe("Invalid upload format");
    expect(validation.missingFields).toEqual(["Tes No", "Name", "Course", "Dt of Arrival"]);
    expect(validation.message).toContain(getOCBulkRequiredColumnsText());
  });

  it("rejects empty files with a user-facing message", () => {
    const validation = validateOCBulkUploadRows([
      {
        "Tes No": "",
        Name: "",
        Course: "",
        "Dt of Arrival": "",
      },
    ]);

    expect(validation.ok).toBe(false);
    if (validation.ok) return;

    expect(validation.message).toContain("uploaded file is empty");
  });

  it("allows extra optional columns when required headers are present", () => {
    const validation = validateOCBulkUploadRows([
      {
        "Tes No": "7503",
        Name: "OC Extra",
        Course: "TES-51",
        "Dt of Arrival": "2026-03-01",
        "Unexpected Column": "kept for server-side dry-run validation",
      },
    ]);

    expect(validation.ok).toBe(true);
  });
});
