import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

export interface FamilyMember {
    name: string;
    relation: string;
    age: string;
    occupation: string;
    education: string;
    mobile: string;
}

/** Fetch all family members for a cadet */
export async function getFamilyDetails(ocId: string) {
    return api.get<FamilyMember[]>(endpoints.oc.family(ocId));
}

/** Save or update all family members for a cadet */
export async function saveFamilyDetails(ocId: string, family: FamilyMember[]) {
    return api.post<FamilyMember[]>(endpoints.oc.family(ocId), family);
}

/** Optionally patch partial updates */
export async function patchFamilyDetails(
    ocId: string,
    family: Partial<FamilyMember>[]
) {
    return api.patch<FamilyMember[]>(endpoints.oc.family(ocId), family);
}
