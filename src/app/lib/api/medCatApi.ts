import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

export interface MedicalCategoryPayload {
    semester: number;
    date: string; // "YYYY-MM-DD"
    mosAndDiagnostics: string;
    categoryFrom?: string | null;
    categoryTo?: string | null;
    mhAdmissionFrom?: string | null;
    mhAdmissionTo?: string | null;
    absence?: string | null;
    platoonCommanderName?: string | null;
}

export interface MedicalCategoryResponse extends MedicalCategoryPayload {
    id?: string;
    ocId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ApiResponse<T = any> {
    status: number;
    ok?: boolean;
    data?: T;
}

/**
 * Save one or more Medical Category records for a cadet.
 */
export async function saveMedicalCategory(
    ocId: string,
    records: MedicalCategoryPayload[]
): Promise<ApiResponse[]> {
    const responses: ApiResponse[] = [];

    try {
        for (const r of records) {
            const payload = {
                semester: Number(r.semester),
                date: r.date ? r.date.split("T")[0] : "",
                mosAndDiagnostics: r.mosAndDiagnostics,
                categoryFrom: r.categoryFrom || null,
                categoryTo: r.categoryTo || null,
                mhAdmissionFrom: r.mhAdmissionFrom || null,
                mhAdmissionTo: r.mhAdmissionTo || null,
                absence: r.absence || null,
                platoonCommanderName: r.platoonCommanderName || null,
            };

            console.log(" Sending Medical CAT payload:", payload);
            const response = (await api.post(
                endpoints.oc.medicalCategory(ocId),
                payload
            )) as ApiResponse;

            responses.push(response);
        }

        return responses;
    } catch (error: any) {
        console.error(" Failed to save Medical CAT:", error);
        return [];
    }
}

/**
 * Fetch all Medical Category records for a cadet.
 */
export async function getMedicalCategory(
    ocId: string
): Promise<MedicalCategoryResponse[]> {
    try {
        const response = (await api.get(endpoints.oc.medicalCategory(ocId))) as any;

        if (Array.isArray(response?.items)) {
            return response.items;
        }

        if (Array.isArray(response)) {
            return response;
        }

        return [];
    } catch (error) {
        console.error(" Failed to fetch Medical CAT:", error);
        return [];
    }
}

export async function updateMedicalCategory(
    ocId: string,
    catId: string,
    payload: Partial<MedicalCategoryPayload>
): Promise<ApiResponse> {
    try {
        const response = (await api.patch(
            endpoints.oc.medcatById(ocId, catId),
            payload
        )) as ApiResponse;

        return response;
    } catch (err) {
        console.error("Failed to update MED CAT:", err);
        throw err;
    }
}

export async function deleteMedicalCategory(
    ocId: string,
    catId: string
): Promise<ApiResponse> {
    try {
        const response = (await api.delete(
            endpoints.oc.medcatById(ocId, catId)
        )) as ApiResponse;

        return response;
    } catch (err) {
        console.error("Failed to delete MED CAT:", err);
        throw err;
    }
}
