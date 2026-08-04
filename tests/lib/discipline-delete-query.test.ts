import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("discipline delete query", () => {
  it("hard deletes dossier discipline records instead of setting deletedAt", () => {
    // Keep the source assertion portable across Windows (CRLF) and Linux (LF).
    const source = readFileSync("src/app/db/queries/oc.ts", "utf8").replace(/\r\n/g, "\n");
    const deleteDisciplineBlock = source.match(
      /export async function deleteDiscipline[\s\S]*?\n}\n/
    )?.[0];

    expect(deleteDisciplineBlock, "deleteDiscipline function was not found").toBeDefined();
    expect(deleteDisciplineBlock).toContain(".delete(ocDiscipline)");
    expect(deleteDisciplineBlock).not.toContain(".set({ deletedAt:");
  });
});
