import { describe, expect, it, vi } from "vitest";

import {
  archiveOCsSequentially,
  buildBulkArchiveSummary,
  formatBulkArchiveLabel,
  getFriendlyArchiveError,
} from "@/app/lib/oc/bulk-archive";

describe("OC bulk archive helper", () => {
  it("archives selected OCs sequentially through the supplied delete function", async () => {
    const archiveOC = vi.fn(async () => undefined);

    const result = await archiveOCsSequentially(
      [
        { id: "oc-1", name: "OC One", ocNo: "7501" },
        { id: "oc-2", name: "OC Two", ocNo: "7502" },
      ],
      archiveOC,
    );

    expect(archiveOC).toHaveBeenNthCalledWith(1, "oc-1");
    expect(archiveOC).toHaveBeenNthCalledWith(2, "oc-2");
    expect(result.archivedIds).toEqual(["oc-1", "oc-2"]);
    expect(result.failed).toEqual([]);
    expect(buildBulkArchiveSummary(result)).toBe("Deleted 2 selected OCs.");
  });

  it("continues after a failed OC and returns a user-friendly failure list", async () => {
    const archiveOC = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce({ status: 403, code: "forbidden", message: "Forbidden" })
      .mockRejectedValueOnce({ status: 404, code: "not_found", message: "OC not found" });

    const result = await archiveOCsSequentially(
      [
        { id: "oc-1", name: "OC One", ocNo: "7501" },
        { id: "oc-2", name: "OC Two", ocNo: "7502" },
        { id: "oc-3", ocNo: "7503" },
      ],
      archiveOC,
    );

    expect(result.archivedIds).toEqual(["oc-1"]);
    expect(result.failed).toEqual([
      {
        id: "oc-2",
        label: "OC Two (7502)",
        message: "You do not have permission to delete this OC.",
      },
      {
        id: "oc-3",
        label: "7503",
        message: "This OC was already deleted or no longer exists.",
      },
    ]);
    expect(buildBulkArchiveSummary(result)).toBe("Deleted 1 OC. 2 could not be deleted.");
  });

  it("uses readable labels and fallback messages", () => {
    expect(formatBulkArchiveLabel({ id: "oc-1", name: "OC One", ocNo: "7501" })).toBe("OC One (7501)");
    expect(formatBulkArchiveLabel({ id: "oc-1" })).toBe("oc-1");
    expect(getFriendlyArchiveError({ message: "Dependent workflow blocked deletion." })).toBe(
      "Dependent workflow blocked deletion.",
    );
    expect(getFriendlyArchiveError(null)).toBe("Could not delete this OC. Please try again.");
  });
});
