import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

/** Shape of one parent communication record */
export interface ParentCommPayload {
    semester: number;
    mode: "LETTER" | "PHONE" | "EMAIL" | "IN_PERSON" | "OTHER";
    refNo?: string | null;
    date: string; // YYYY-MM-DD
    subject: string;
    brief: string;
    platoonCommanderName?: string | null;
}

/** Response shape from backend (example) */
export interface ParentCommResponse extends ParentCommPayload {
    id?: string;
    ocId?: string;
    createdAt?: string;
    updatedAt?: string;
}

/** Generic API Response wrapper */
export interface ApiResponse<T = any> {
    status: number;
    ok?: boolean;
    data?: T;
}

/**
 * Save one or more Parent Communication records for a cadet.
 */
export async function saveParentComms(
    ocId: string,
    records: ParentCommPayload[]
): Promise<ApiResponse[]> {
    const responses: ApiResponse[] = [];

    try {
        for (const r of records) {
            const payload = {
                semester: Number(r.semester),
                mode: r.mode,
                refNo: r.refNo || null,
                date: typeof r.date === "string" ? r.date : new Date(r.date).toISOString().split("T")[0],
                subject: r.subject,
                brief: r.brief,
                platoonCommanderName: r.platoonCommanderName || null,
            };

            console.log("Sending Parent Communication payload:", payload);

            const response = (await api.post(
                endpoints.oc.parentComms(ocId),
                payload
            )) as ApiResponse;

            responses.push(response);
        }

        return responses;
    } catch (error: any) {
        console.error("Failed to save Parent Comms:", error);
        return [];
    }
}

export async function getParentComms(
    ocId: string
): Promise<ParentCommResponse[]> {
    try {
        const res = (await api.get(endpoints.oc.parentComms(ocId))) as any;
        if (Array.isArray(res?.items)) return res.items;
        if (Array.isArray(res)) return res;
        return [];
    } catch (err) {
        console.error("Failed to fetch Parent Comms:", err);
        return [];
    }
}

export async function updateParentComm(
    ocId: string,
    commId: string,
    payload: Partial<ParentCommPayload>
): Promise<ApiResponse> {
    try {
        const res = await api.patch(
            endpoints.oc.parentCommsById(ocId, commId),
            payload
        );
        return res as ApiResponse;
    } catch (err) {
        console.error("Failed to update Parent Communication:", err);
        throw err;
    }
}

export async function deleteParentComm(
    ocId: string,
    commId: string
): Promise<ApiResponse> {
    try {
        const res = await api.delete(
            endpoints.oc.parentCommsById(ocId, commId)
        );
        return res as ApiResponse;
    } catch (err) {
        console.error("Failed to delete Parent Communication:", err);
        throw err;
    }
}
