import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

export interface DisciplinePayloadClient {
    semester: number | string;
    dateOfOffence: string | Date | null;
    offence: string | null;
    punishmentAwarded?: string | null;
    awardedOn?: string | Date | null;
    awardedBy?: string | null;
    pointsDelta?: number | string | null;
    pointsCumulative?: number | string | null;
}

export interface DisciplineResponse {
    id?: string;
    semester: number;
    dateOfOffence: string;
    offence: string;
    punishmentAwarded?: string | null;
    awardedOn?: string | null;
    awardedBy?: string | null;
    pointsDelta?: number;
    pointsCumulative?: number;
    createdAt?: string;
    updatedAt?: string;
    // For admin all records
    ocId?: string;
    ocName?: string;
    ocNo?: string;
}

function toISODateString(v?: string | Date | null) {
    if (!v) return undefined;
    if (typeof v === "string") {
        const parsed = new Date(v);
        if (Number.isNaN(parsed.getTime())) return undefined;
        return parsed.toISOString().split("T")[0];
    }
    if (v instanceof Date) {
        if (Number.isNaN(v.getTime())) return undefined;
        return v.toISOString().split("T")[0];
    }
    // fallback
    try {
        const d = new Date(String(v));
        if (Number.isNaN(d.getTime())) return undefined;
        return d.toISOString().split("T")[0];
    } catch {
        return undefined;
    }
}

export async function saveDisciplineRecords(
    ocId: string,
    records: DisciplinePayloadClient[]
): Promise<{ ok: boolean; result: any; payloads: any[] }> {
    const payloads: any[] = [];

    for (const r of records) {
        const payload = {
            semester: Number(r.semester),
            dateOfOffence: toISODateString(r.dateOfOffence),
            offence: r.offence ? String(r.offence).trim() : "",
            punishmentAwarded: r.punishmentAwarded ?? undefined,
            awardedOn: toISODateString(r.awardedOn),
            awardedBy: r.awardedBy ?? undefined,
            pointsDelta: r.pointsDelta !== undefined && r.pointsDelta !== null ? Number(r.pointsDelta) : undefined,
            pointsCumulative: r.pointsCumulative !== undefined && r.pointsCumulative !== null ? Number(r.pointsCumulative) : undefined,
        };

        payloads.push(payload);
    }

    for (const p of payloads) {
        if (!p.dateOfOffence) {
            return { ok: false, result: "Validation: dateOfOffence required and must be a valid date", payloads };
        }
        if (!p.offence || p.offence.length < 1) {
            return { ok: false, result: "Validation: offence is required", payloads };
        }
    }

    const results: any[] = [];
    try {
        for (const p of payloads) {
            console.log("Discipline payload sending:", p); // inspect payload
            const res = await api.post(endpoints.oc.discipline((ocId)), p);
            results.push(res);
        }
        return { ok: true, result: results, payloads };
    } catch (err) {
        console.error("Failed to save discipline records:", err);
        return { ok: false, result: err, payloads };
    }
}

/** Fetch discipline records */
export async function getDisciplineRecords(ocId: string): Promise<DisciplineResponse[]> {
    try {
        const response = (await api.get(endpoints.oc.discipline(ocId))) as any;

        if (Array.isArray(response?.items)) return response.items;
        if (Array.isArray(response)) return response;

        return [];
    } catch (error) {
        console.error("Failed to fetch discipline records:", error);
        return [];
    }
}

// PATCH update
export async function updateDisciplineRecord(
    ocId: string,
    disciplineId: string,
    payload: Record<string, unknown>
) {
    return await api.patch(
        endpoints.oc.discipRec(ocId, disciplineId),
        payload
    );
}

// DELETE record
export async function deleteDisciplineRecord(
    ocId: string,
    disciplineId: string
) {
    return await api.delete(
        endpoints.oc.discipRec(ocId, disciplineId),
    );
}

/** Fetch all discipline records for admin */
export async function getAllDisciplineRecords(): Promise<DisciplineResponse[]> {
    try {
        const response = (await api.get(endpoints.admin.discipline)) as any;

        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response)) return response;

        return [];
    } catch (error) {
        console.error("Failed to fetch all discipline records:", error);
        return [];
    }
}
