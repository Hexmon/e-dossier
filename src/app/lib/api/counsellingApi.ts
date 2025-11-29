import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";
import type { CounsellingRow } from "@/types/counselling";
import { semestersCounselling, warningTypes } from "@/constants/app.constants";

// Helper: map semester (1-6) <-> term label ("I TERM", ...)
function termFromSemester(semester: number | null | undefined): string {
    if (!semester) return "";
    return semestersCounselling[semester - 1] ?? "";
}

function semesterFromTerm(term: string): number | null {
    const idx = semestersCounselling.indexOf(term);
    if (idx === -1) return null;
    return idx + 1;
}

// Helper: map backend enum -> UI label
function uiWarningFromServer(nature: string | null | undefined): string {
    if (!nature) return "";

    switch (nature.toUpperCase()) {
        case "RELEGATION":
            return "Relegation";
        case "WITHDRAWAL":
            return "Withdrawal";
        case "OTHER":
        default:
            // Title-case fallback
            return nature.charAt(0) + nature.slice(1).toLowerCase();
    }
}

// Helper: map UI label -> backend enum
function serverWarningFromUi(type: string | null | undefined): "RELEGATION" | "WITHDRAWAL" | "OTHER" {
    if (!type) return "OTHER";
    const upper = type.toUpperCase();

    if (upper.startsWith("RELEG")) return "RELEGATION";
    if (upper.startsWith("WITHD")) return "WITHDRAWAL";

    return "OTHER";
}


interface BackendCounsellingRow {
    id: string;
    semester: number;
    reason: string;
    natureOfWarning: string;
    date: string; // ISO date string
    warnedBy: string;
}

function mapBackendToUi(row: BackendCounsellingRow, serialNo = ""): CounsellingRow {
    return {
        id: row.id,
        serialNo,
        term: termFromSemester(row.semester),
        reason: row.reason,
        warningType: uiWarningFromServer(row.natureOfWarning),
        date: row.date,
        warningBy: row.warnedBy,
    };
}


export async function getCounsellingRecords(ocId: string): Promise<CounsellingRow[]> {
    try {
        const response: any = await api.get(endpoints.oc.counselling(ocId));

        let rows: BackendCounsellingRow[] = [];

        if (Array.isArray(response?.items)) {
            rows = response.items as BackendCounsellingRow[];
        } else if (Array.isArray(response)) {
            rows = response as BackendCounsellingRow[];
        } else if (Array.isArray(response?.data)) {
            rows = response.data as BackendCounsellingRow[];
        }

        return rows.map((row, index) => mapBackendToUi(row, String(index + 1)));
    } catch (error) {
        console.error("Failed to fetch counselling records:", error);
        return [];
    }
}


export async function saveCounsellingRecords(ocId: string, payload: any[]): Promise<CounsellingRow[]> {
    const results: CounsellingRow[] = [];

    for (const record of payload) {
        const semester = semesterFromTerm(record.term);

        if (!semester) {
            throw new Error(`Invalid term: ${record.term}`);
        }

        const body = {
            semester,
            reason: record.reason,
            natureOfWarning: serverWarningFromUi(record.warningType),
            date: record.date,
            warnedBy: record.warningBy,
        };

        const res: any = await api.post(endpoints.oc.counselling(ocId), body);
        const row: BackendCounsellingRow = (res?.data ?? res) as BackendCounsellingRow;
        results.push(mapBackendToUi(row));
    }

    return results;
}


export async function updateCounsellingRecord(
    ocId: string,
    id: string,
    updates: Partial<CounsellingRow>,
): Promise<CounsellingRow> {
    const body: any = {};

    if (updates.term !== undefined) {
        const semester = semesterFromTerm(updates.term);
        if (!semester) throw new Error(`Invalid term: ${updates.term}`);
        body.semester = semester;
    }
    if (updates.reason !== undefined) body.reason = updates.reason;
    if (updates.warningType !== undefined)
        body.natureOfWarning = serverWarningFromUi(updates.warningType);
    if (updates.date !== undefined) body.date = updates.date;
    if (updates.warningBy !== undefined) body.warnedBy = updates.warningBy;

    const res: any = await api.patch(endpoints.oc.counsellingById(ocId, id), body);
    const row: BackendCounsellingRow = (res?.data ?? res) as BackendCounsellingRow;
    return mapBackendToUi(row);
}


export async function deleteCounsellingRecord(ocId: string, id: string, opts: { hard?: boolean } = {}) {
    const query = opts.hard ? { hard: true } : undefined;
    await api.delete(endpoints.oc.counsellingById(ocId, id), { query });
}
