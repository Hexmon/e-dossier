import { describe, expect, it } from "vitest";
import {
  buildBulkAcademicMarksTemplateRows,
  getBulkAcademicMarksTemplateColumns,
  importBulkAcademicMarksRows,
  type BulkAcademicMarksImportRow,
} from "@/components/academics/bulkAcademicMarksImport";

const baseRows: BulkAcademicMarksImportRow[] = [
  {
    id: "oc-1",
    ocNo: "7501",
    name: "OC Alpha",
    phase1: "",
    phase2: "",
    tutorial: "",
    sessional: 0,
    final: "",
    contentOfExp: "",
    maintOfExp: "",
    practicalExam: "",
    viva: "",
    practical: "",
    total: 0,
  },
  {
    id: "oc-2",
    ocNo: "7502",
    name: "OC Bravo",
    phase1: "",
    phase2: "",
    tutorial: "",
    sessional: 0,
    final: "",
    contentOfExp: "",
    maintOfExp: "",
    practicalExam: "",
    viva: "",
    practical: "",
    total: 0,
  },
];

describe("bulk academic marks import", () => {
  it("builds a template from the selected theory and practical layout", () => {
    const columns = getBulkAcademicMarksTemplateColumns({
      includeTheory: true,
      includePractical: true,
    });

    expect(columns.map((column) => column.label)).toEqual([
      "OC No",
      "Name",
      "PH-I",
      "PH-II",
      "Tutorial",
      "Sessional",
      "Final (Theory)",
      "Conduct of Exp",
      "Maint of Records",
      "Practical Exam",
      "Viva",
      "Practical",
      "Total",
    ]);

    expect(buildBulkAcademicMarksTemplateRows(baseRows, {
      includeTheory: true,
      includePractical: false,
    })[0]).toMatchObject({
      "OC No": "7501",
      Name: "OC Alpha",
      "PH-I": "",
      "Final (Theory)": "",
      Total: "",
    });
  });

  it("maps uploaded marks by OC number and computes totals", () => {
    const result = importBulkAcademicMarksRows(
      baseRows,
      [
        {
          "OC No": "7501",
          Name: "OC Alpha",
          "PH-I": 10,
          "PH-II": 11,
          Tutorial: 9,
          "Final (Theory)": 40,
          "Conduct of Exp": 5,
          "Maint of Records": 6,
          "Practical Exam": 20,
          Viva: 8,
        },
      ],
      { includeTheory: true, includePractical: true },
    );

    expect(result.updatedRows).toBe(1);
    expect(result.rows[0]).toMatchObject({
      phase1: "10",
      phase2: "11",
      tutorial: "9",
      sessional: 30,
      final: "40",
      contentOfExp: "5",
      maintOfExp: "6",
      practicalExam: "20",
      viva: "8",
      practical: "39",
      total: 109,
    });
    expect(result.rows[1].total).toBe(0);
  });

  it("falls back to unique name matching and reports skipped cells", () => {
    const result = importBulkAcademicMarksRows(
      baseRows,
      [
        { Name: "OC Bravo", "PH-I": "7", "PH-II": "bad" },
        { "OC No": "9999", "PH-I": "5" },
      ],
      { includeTheory: true, includePractical: false },
    );

    expect(result.updatedRows).toBe(1);
    expect(result.unmatchedRows).toBe(1);
    expect(result.invalidCells).toEqual([{ row: 2, field: "PH-II", value: "bad" }]);
    expect(result.rows[1].phase1).toBe("7");
    expect(result.rows[1].phase2).toBe("");
  });
});
