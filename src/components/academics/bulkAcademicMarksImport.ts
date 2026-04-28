import { computePracticalTotalMarks } from "@/app/lib/academic-marks-core";

export type BulkAcademicMarksImportRow = {
    id: string;
    ocNo: string;
    name: string;
    phase1: string;
    phase2: string;
    tutorial: string;
    sessional: number;
    final: string;
    contentOfExp: string;
    maintOfExp: string;
    practicalExam: string;
    viva: string;
    practical: string;
    total: number;
};

export type BulkAcademicMarksComponentFlags = {
    includeTheory: boolean;
    includePractical: boolean;
};

export type SheetRow = Record<string, unknown>;
type NormalizedSheetRow = Map<string, unknown>;

export type TemplateColumn = {
    key: keyof BulkAcademicMarksImportRow;
    label: string;
    computed?: boolean;
};

export type ImportMarksResult = {
    rows: BulkAcademicMarksImportRow[];
    updatedRows: number;
    updatedCells: number;
    unmatchedRows: number;
    duplicateRows: number;
    invalidCells: Array<{ row: number; field: string; value: string }>;
};

const practicalComponentKeys = ["contentOfExp", "maintOfExp", "practicalExam", "viva"] as const;

const FIELD_ALIASES: Record<string, string[]> = {
    ocNo: ["OC No", "OC Number", "OCNO", "OC", "Tes No", "TES No", "TES NO", "TesNo"],
    name: ["Name", "Cadet Name", "OC Name"],
    phase1: ["PH-I", "PH I", "Phase Test 1", "Phase Test I", "Phase 1", "Phase-I", "Theory PH-I"],
    phase2: ["PH-II", "PH II", "Phase Test 2", "Phase Test II", "Phase 2", "Phase-II", "Theory PH-II"],
    tutorial: ["Tutorial", "Tutorial Marks", "Theory Tutorial"],
    final: ["Final (Theory)", "Theory Final", "Final Theory", "Theory Final Marks", "Final"],
    contentOfExp: ["Conduct of Exp", "Conduct of Experiment", "Content of Exp", "Content of Experiment"],
    maintOfExp: ["Maint of Records", "Maintenance of Records", "Maint of Exp", "Maintenance of Exp"],
    practicalExam: ["Practical Exam", "Practical Marks", "Practical Test", "Practical Examination"],
    viva: ["Viva", "Viva Marks"],
    practical: ["Practical", "Practical Total", "Final (Practical)", "Practical Final", "Final Practical"],
};

export function getBulkAcademicMarksTemplateColumns(
    components: BulkAcademicMarksComponentFlags,
): TemplateColumn[] {
    const columns: TemplateColumn[] = [
        { key: "ocNo", label: "OC No" },
        { key: "name", label: "Name" },
    ];

    if (components.includeTheory) {
        columns.push(
            { key: "phase1", label: "PH-I" },
            { key: "phase2", label: "PH-II" },
            { key: "tutorial", label: "Tutorial" },
            { key: "sessional", label: "Sessional", computed: true },
            { key: "final", label: "Final (Theory)" },
        );
    }

    if (components.includePractical) {
        columns.push(
            { key: "contentOfExp", label: "Conduct of Exp" },
            { key: "maintOfExp", label: "Maint of Records" },
            { key: "practicalExam", label: "Practical Exam" },
            { key: "viva", label: "Viva" },
            { key: "practical", label: "Practical", computed: true },
        );
    }

    columns.push({ key: "total", label: "Total", computed: true });
    return columns;
}

export function buildBulkAcademicMarksTemplateRows(
    rows: BulkAcademicMarksImportRow[],
    components: BulkAcademicMarksComponentFlags,
): SheetRow[] {
    const columns = getBulkAcademicMarksTemplateColumns(components);

    return rows.map((row) => {
        const out: SheetRow = {};
        for (const column of columns) {
            if (column.key === "ocNo" || column.key === "name") {
                out[column.label] = row[column.key];
            } else {
                out[column.label] = "";
            }
        }
        return out;
    });
}

export function importBulkAcademicMarksRows(
    currentRows: BulkAcademicMarksImportRow[],
    sheetRows: SheetRow[],
    components: BulkAcademicMarksComponentFlags,
): ImportMarksResult {
    const rows = currentRows.map((row) => ({ ...row }));
    const byOcNo = new Map<string, number>();
    const byName = new Map<string, number | null>();

    rows.forEach((row, index) => {
        const ocNoKey = normalizeMatchValue(row.ocNo);
        if (ocNoKey) byOcNo.set(ocNoKey, index);

        const nameKey = normalizeMatchValue(row.name);
        if (!nameKey) return;
        byName.set(nameKey, byName.has(nameKey) ? null : index);
    });

    const seenIndexes = new Set<number>();
    const invalidCells: ImportMarksResult["invalidCells"] = [];
    let updatedRows = 0;
    let updatedCells = 0;
    let unmatchedRows = 0;
    let duplicateRows = 0;

    sheetRows.forEach((sheetRow, sheetIndex) => {
        if (!hasAnyValue(sheetRow)) return;

        const normalizedSheetRow = normalizeSheetRow(sheetRow);
        const ocNo = getCellText(normalizedSheetRow, FIELD_ALIASES.ocNo);
        const name = getCellText(normalizedSheetRow, FIELD_ALIASES.name);
        let rowIndex = ocNo ? byOcNo.get(normalizeMatchValue(ocNo)) : undefined;

        if (rowIndex === undefined && name) {
            const matchedByName = byName.get(normalizeMatchValue(name));
            rowIndex = matchedByName === null ? undefined : matchedByName;
        }

        if (rowIndex === undefined) {
            unmatchedRows += 1;
            return;
        }

        if (seenIndexes.has(rowIndex)) {
            duplicateRows += 1;
            return;
        }
        seenIndexes.add(rowIndex);

        const next = { ...rows[rowIndex] };
        let rowChanged = false;
        let practicalComponentChanged = false;

        const applyMark = (key: keyof BulkAcademicMarksImportRow, fieldLabel: string) => {
            const cellValue = getCellText(normalizedSheetRow, FIELD_ALIASES[String(key)] ?? []);
            if (cellValue === null) return;

            if (!isValidMark(cellValue)) {
                invalidCells.push({ row: sheetIndex + 2, field: fieldLabel, value: cellValue });
                return;
            }

            if (next[key] !== cellValue) {
                (next as Record<string, string | number>)[key] = cellValue;
                rowChanged = true;
                updatedCells += 1;
            }

            if ((practicalComponentKeys as readonly string[]).includes(String(key))) {
                practicalComponentChanged = true;
            }
        };

        if (components.includeTheory) {
            applyMark("phase1", "PH-I");
            applyMark("phase2", "PH-II");
            applyMark("tutorial", "Tutorial");
            applyMark("final", "Final (Theory)");
        }

        if (components.includePractical) {
            applyMark("contentOfExp", "Conduct of Exp");
            applyMark("maintOfExp", "Maint of Records");
            applyMark("practicalExam", "Practical Exam");
            applyMark("viva", "Viva");

            const practicalTotal = getCellText(normalizedSheetRow, FIELD_ALIASES.practical);
            if (practicalTotal !== null && !practicalComponentChanged) {
                if (!isValidMark(practicalTotal)) {
                    invalidCells.push({ row: sheetIndex + 2, field: "Practical", value: practicalTotal });
                } else if (next.practical !== practicalTotal) {
                    next.practical = practicalTotal;
                    rowChanged = true;
                    updatedCells += 1;
                }
            }

            if (practicalComponentChanged) {
                const derivedPractical = derivePracticalTotal(next);
                if (next.practical !== derivedPractical) {
                    next.practical = derivedPractical;
                    rowChanged = true;
                }
            }
        }

        const sessional = components.includeTheory
            ? toMarksNumber(next.phase1) + toMarksNumber(next.phase2) + toMarksNumber(next.tutorial)
            : 0;
        const total =
            sessional +
            (components.includeTheory ? toMarksNumber(next.final) : 0) +
            (components.includePractical ? toMarksNumber(next.practical) : 0);

        if (next.sessional !== sessional) {
            next.sessional = sessional;
            rowChanged = true;
        }

        if (next.total !== total) {
            next.total = total;
            rowChanged = true;
        }

        if (rowChanged) {
            rows[rowIndex] = next;
            updatedRows += 1;
        }
    });

    return {
        rows,
        updatedRows,
        updatedCells,
        unmatchedRows,
        duplicateRows,
        invalidCells,
    };
}

function normalizeHeader(value: string): string {
    return value
        .toLowerCase()
        .replace(/['`\u2019]/g, "'")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function normalizeMatchValue(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function normalizeSheetRow(row: SheetRow): NormalizedSheetRow {
    const valuesByHeader = new Map<string, unknown>();
    Object.entries(row).forEach(([key, value]) => {
        valuesByHeader.set(normalizeHeader(key), value);
    });
    return valuesByHeader;
}

function getCellText(row: NormalizedSheetRow, aliases: string[]): string | null {
    for (const alias of aliases) {
        const value = row.get(normalizeHeader(alias));
        if (value === undefined || value === null) continue;

        const text = String(value).trim();
        if (text !== "") return text;
    }

    return null;
}

function hasAnyValue(row: SheetRow): boolean {
    return Object.values(row).some((value) => String(value ?? "").trim() !== "");
}

function isValidMark(value: string): boolean {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0;
}

function toMarksNumber(value: string): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

function derivePracticalTotal(row: Pick<BulkAcademicMarksImportRow, typeof practicalComponentKeys[number]>): string {
    return String(
        computePracticalTotalMarks({
            contentOfExpMarks: row.contentOfExp,
            maintOfExpMarks: row.maintOfExp,
            practicalMarks: row.practicalExam,
            vivaMarks: row.viva,
        }),
    );
}
