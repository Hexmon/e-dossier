import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function migration(name: string) {
  return readFileSync(`drizzle/${name}`, "utf8");
}

describe("enrollment semester migration safety", () => {
  it("does not reset active enrollment semesters in migrations 0037 or 0038", () => {
    const legacyMigrations = [
      migration("0037_dossier_lock_and_enrollment_semester.sql"),
      migration("0038_reset_active_enrollment_semester_to_one.sql"),
    ];

    for (const sql of legacyMigrations) {
      expect(sql).not.toMatch(
        /UPDATE\s+"oc_course_enrollments"[\s\S]*?SET\s+"current_semester"\s*=\s*1/i,
      );
    }
  });

  it("ships an idempotent, evidence-based forward repair", () => {
    const sql = migration("0051_preserve_and_repair_enrollment_semesters.sql");

    expect(sql).toContain("ACTIVE_ENROLLMENT_SEMESTER_RESET");
    expect(sql).toContain("oc_reconciliation_audit");
    expect(sql).toContain('e."current_semester" = 1');
    expect(sql).toContain("latest_movement");
    expect(sql.match(/r\."to_semester" BETWEEN 1 AND 6/g)).toHaveLength(2);
    expect(sql).toContain("record_evidence");
    expect(sql).not.toMatch(/\b(?:DELETE|TRUNCATE|DROP)\b/i);
    expect(sql).not.toContain("course_offerings");
  });

  it("registers the forward repair after migration 0050", () => {
    const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
    const entry = journal.entries.at(-1);

    expect(entry).toMatchObject({
      idx: 51,
      tag: "0051_preserve_and_repair_enrollment_semesters",
      breakpoints: true,
    });
  });
});
