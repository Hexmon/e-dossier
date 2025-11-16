import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

// ----------------------
// Types
// ----------------------
export interface MotivationAwardPayload {
    semester: number;
    fieldName: string;
    motivationTitle: string;
    maxMarks: number;
    marksObtained: number;
}

export interface MotivationAwardRecord extends MotivationAwardPayload {
    id: string;
}

// ----------------------
// API Functions
// ----------------------

/** CREATE motivation award entry */
export async function createMotivationAward(
    ocId: string,
    payload: MotivationAwardPayload
) {
    console.log("motivation award", payload);
    return api.post(endpoints.oc.motivationAwards(ocId), payload);
}

/** GET all motivation awards of a cadet */
export async function getMotivationAwards(ocId: string) {
    const res = await api.get(endpoints.oc.motivationAwards(ocId));

    // API returns: { items: [...] }
    return (res as any)?.items ?? [];
}

/** UPDATE a motivation award by ID */
// export async function updateMotivationAward(
//     ocId: string,
//     awardId: string,
//     payload: Partial<MotivationAwardPayload>
// ) {
//     return api.patch(endpoints.oc.motivationAwardById(ocId, awardId), payload);
// }

/** DELETE a record */
// export async function deleteMotivationAward(ocId: string, awardId: string) {
//     return api.delete(endpoints.oc.motivationAwardById(ocId, awardId));
// }
