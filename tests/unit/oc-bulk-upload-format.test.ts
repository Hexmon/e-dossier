import { describe, expect, it } from "vitest";

import {
  getOCBulkRequiredColumnsText,
  prepareOCBulkUploadPreview,
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

  it("uses PI as the platoon preview fallback when no Platoon column exists", () => {
    const validation = validateOCBulkUploadRows([
      {
        "Tes No": "7506",
        Name: "OC PI Platoon",
        Course: "TES-51",
        "Dt of Arrival": "2026-06-01",
        PI: "RANAPRATAP",
      },
    ]);

    expect(validation.ok).toBe(true);
    if (!validation.ok) return;

    expect(toOCBulkPreviewRow(validation.nonEmptyRows[0])).toMatchObject({
      platoon: "RANAPRATAP",
    });
  });

  it("prefers explicit Platoon over PI for preview when both are present", () => {
    const validation = validateOCBulkUploadRows([
      {
        "Tes No": "7507",
        Name: "OC Explicit Platoon",
        Course: "TES-51",
        "Dt of Arrival": "2026-06-02",
        Platoon: "ARJUN",
        PI: "RANAPRATAP",
      },
    ]);

    expect(validation.ok).toBe(true);
    if (!validation.ok) return;

    expect(toOCBulkPreviewRow(validation.nonEmptyRows[0])).toMatchObject({
      platoon: "ARJUN",
    });
  });

  it("rejects files that are missing required headers before preview/upload", () => {
    const validation = validateOCBulkUploadRows([
      {
        Name: "Missing TES",
        Course: "TES-51",
        "Dt of Arrival": "2026-01-10",
      },
    ]);

    expect(validation.ok).toBe(false);
    if (validation.ok) return;

    expect(validation.title).toBe("Invalid upload format");
    expect(validation.missingFields).toEqual(["Tes No"]);
    expect(validation.message).toContain(getOCBulkRequiredColumnsText());
  });

  it("prepares invalid files for a blocked preview and sample-format highlight", () => {
    const prepared = prepareOCBulkUploadPreview([
      {
        "Cadet Name": "Wrong Sheet",
        Batch: "TES-51",
      },
    ]);

    expect(prepared.ok).toBe(false);
    if (prepared.ok) return;

    expect(prepared.highlightSampleFormat).toBe(true);
    expect(prepared.title).toBe("Wrong OC bulk upload format");
    expect(prepared.message).toContain("Wrong OC bulk upload format");
    expect(prepared.message).toContain("Cadet Name");
  });

  it("prepares valid files for preview and clears sample-format highlight", () => {
    const prepared = prepareOCBulkUploadPreview([
      {
        "Tes No": "7504",
        Name: "OC Preview",
        Course: "TES-51",
        "Dt of Arrival": "2026-04-01",
      },
    ]);

    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;

    expect(prepared.highlightSampleFormat).toBe(false);
    expect(prepared.previewRows).toHaveLength(1);
    expect(prepared.previewRows[0]).toMatchObject({
      tesNo: "7504",
      name: "OC Preview",
      arrival: "01-Apr-2026",
    });
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

  it("accepts known optional headings and aliases when required headers are present", () => {
    const validation = validateOCBulkUploadRows([
      {
        "Tes No": "7503",
        Name: "OC Extra",
        Course: "TES-51",
        "Dt of Arrival": "2026-03-01",
        Email: "oc.extra@example.com",
        "Father Address": "Known alias",
        "Nearest Railway Station": "Secunderabad",
      },
    ]);

    expect(validation.ok).toBe(true);
  });

  it("rejects unknown headings even when all required headings are present", () => {
    const validation = validateOCBulkUploadRows([
      {
        "Tes No": "7505",
        Name: "OC Wrong Heading",
        Course: "TES-51",
        "Dt of Arrival": "2026-05-01",
        "Unexpected Column": "wrong format",
      },
    ]);

    expect(validation.ok).toBe(false);
    if (validation.ok) return;

    expect(validation.title).toBe("Wrong OC bulk upload format");
    expect(validation.invalidHeaders).toEqual(["Unexpected Column"]);
    expect(validation.message).toContain("Unexpected Column");
    expect(validation.message).toContain("View Sample Format");
  });
});
