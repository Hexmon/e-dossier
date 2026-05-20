import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readSource(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("appointment management page source checks", () => {
  it("shows position definitions outside the default-template dialog", () => {
    const source = readSource("src/app/dashboard/genmgmt/appointmentmgmt/page.tsx");

    expect(source).toContain(
      '<PositionDefinitionsTable positions={positions} title="Available Appointment Positions" />',
    );
    expect(source).toContain(
      '<PositionDefinitionsTable\n            positions={DEFAULT_APPOINTMENT_TEMPLATE_POSITIONS}\n            title="Template Appointment Positions"',
    );
  });

  it("uses explicit button actions for default-template API calls", () => {
    const source = readSource("src/app/dashboard/genmgmt/appointmentmgmt/page.tsx");

    expect(source).toContain('onClick={() => applyDefaultTemplateMutation.mutate(true)}');
    expect(source).toContain('onClick={() => applyDefaultTemplateMutation.mutate(false)}');
    expect(source).toContain('type="button"');
  });
});
