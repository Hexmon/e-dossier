import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

export interface MedicalInfoPayload {
    semester: number;
    examDate: string | null;
    age: number;
    heightCm: number;
    ibwKg: number;
    abwKg: number;
    overweightPct: number;
    bmi: number;
    chestCm: number;
    medicalHistory?: string | null;
    hereditaryIssues?: string | null;
    allergies?: string | null;
}

export interface MedicalInfoResponse extends MedicalInfoPayload {
    id?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ApiResponse<T = any> {
    status: number;
    ok?: boolean;
    data?: T;
}

/**
 * Save one or more Medical Info records for a cadet.
 */
export async function saveMedicalInfo(
    ocId: string,
    records: MedicalInfoPayload[]
): Promise<ApiResponse[]> {
    const responses: ApiResponse[] = [];

    try {
        for (const r of records) {
            const cleanDate =
                !r.examDate
                    ? null
                    : typeof r.examDate === "string"
                        ? r.examDate.split("T")[0]
                        : new Date(r.examDate).toISOString().split("T")[0];

            const payload = {
                date: cleanDate ?? "",
                semester: Number(r.semester),
                age: Number(r.age),
                heightCm: Number(r.heightCm),
                ibwKg: Number(r.ibwKg),
                abwKg: Number(r.abwKg),
                overweightPct: Number(r.overweightPct),
                bmi: Number(r.bmi),
                chestCm: Number(r.chestCm),
                medicalHistory: r.medicalHistory ?? null,
                hereditaryIssues: r.hereditaryIssues ?? null,
                allergies: r.allergies ?? null,
            };

            console.log("Sending payload:", payload);
            const response = (await api.post(endpoints.oc.medical(ocId), payload)) as ApiResponse;
            responses.push(response);
        }

        return responses;
    } catch (error: any) {
        console.error("Failed to save medical info:", error);
        return [];
    }
}

/**
 * Fetch all Medical Info records for a cadet.
 */
export async function getMedicalInfo(
    ocId: string
): Promise<MedicalInfoResponse[]> {
    try {
        const response = (await api.get(
            endpoints.oc.medical(ocId)
        )) as any;

        if (Array.isArray(response?.items)) {
            return response.items;
        }

        if (Array.isArray(response)) {
            return response;
        }

        return [];
    } catch (error) {
        console.error("Failed to fetch medical info:", error);
        return [];
    }
}

export async function updateMedicalInfo(
    ocId: string,
    medicalInfoId: string,
    payload: any
) {
    return api.patch(endpoints.oc.medicalById(ocId, medicalInfoId), payload);
}

export async function deleteMedicalInfo(ocId: string, medicalInfoId: string) {
    return api.delete(endpoints.oc.medicalById(ocId, medicalInfoId));
}