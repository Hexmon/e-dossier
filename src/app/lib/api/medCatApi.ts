import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

export interface MedicalCategoryPayload {
    semester: number;
    date: string;
    mosAndDiagnostics: string;
    catFrom?: string | null;
    catTo?: string | null;
    category?: string | null;
    mhFrom?: string | null;
    mhTo?: string | null;
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
    status?: number;
    ok?: boolean;
    message?: string;
    data?: T;
}

function toOptionalPayloadValue(value: string | null | undefined) {
    const trimmed = (value ?? "").trim();
    return trimmed ? trimmed : null;
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
                mosAndDiagnostics: r.mosAndDiagnostics.trim(),
                catFrom: toOptionalPayloadValue(r.catFrom),
                catTo: toOptionalPayloadValue(r.catTo),
                category: toOptionalPayloadValue(r.category),
                mhFrom: toOptionalPayloadValue(r.mhFrom),
                mhTo: toOptionalPayloadValue(r.mhTo),
                absence: toOptionalPayloadValue(r.absence),
                platoonCommanderName: toOptionalPayloadValue(r.platoonCommanderName),
            };

            console.log(" Sending Medical CAT payload:", payload);
            const response = (await api.post<ApiResponse<MedicalCategoryResponse>, typeof payload>(
                endpoints.oc.medicalCategory(ocId),
                payload
            )) as ApiResponse<MedicalCategoryResponse>;

            if (!response || response.ok === false) {
                throw new Error(response?.message || "Failed to save Medical CAT");
            }

            responses.push(response);
        }

        return responses;
    } catch (error: any) {
        console.error(" Failed to save Medical CAT:", error);
        throw error;
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
        const normalizedPayload: Partial<MedicalCategoryPayload> = {
            ...payload,
            ...(payload.date !== undefined ? { date: payload.date ? payload.date.split("T")[0] : "" } : {}),
            ...(payload.mosAndDiagnostics !== undefined
                ? { mosAndDiagnostics: payload.mosAndDiagnostics.trim() }
                : {}),
            ...(payload.catFrom !== undefined ? { catFrom: toOptionalPayloadValue(payload.catFrom) } : {}),
            ...(payload.catTo !== undefined ? { catTo: toOptionalPayloadValue(payload.catTo) } : {}),
            ...(payload.category !== undefined ? { category: toOptionalPayloadValue(payload.category) } : {}),
            ...(payload.mhFrom !== undefined ? { mhFrom: toOptionalPayloadValue(payload.mhFrom) } : {}),
            ...(payload.mhTo !== undefined ? { mhTo: toOptionalPayloadValue(payload.mhTo) } : {}),
            ...(payload.absence !== undefined ? { absence: toOptionalPayloadValue(payload.absence) } : {}),
            ...(payload.platoonCommanderName !== undefined
                ? { platoonCommanderName: toOptionalPayloadValue(payload.platoonCommanderName) }
                : {}),
        };

        const response = (await api.patch(
            endpoints.oc.medcatById(ocId, catId),
            normalizedPayload
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
