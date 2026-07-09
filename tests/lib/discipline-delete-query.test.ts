import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("discipline delete query", () => {
  it("hard deletes dossier discipline records instead of setting deletedAt", () => {
    const source = readFileSync("src/app/db/queries/oc.ts", "utf8");
    const deleteDisciplineBlock = source.match(
      /export async function deleteDiscipline[\s\S]*?\n}\n/
    )?.[0];

    expect(deleteDisciplineBlock).toContain(".delete(ocDiscipline)");
    expect(deleteDisciplineBlock).not.toContain(".set({ deletedAt:");
  });
});
