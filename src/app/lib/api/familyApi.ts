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

/** Save or update all family members for a cadet */
export async function saveFamilyDetails(ocId: string, family: FamilyMember[]) {
    // Wrap the array inside an object
    return api.post(endpoints.oc.family(ocId), { family });
}

/** Optionally patch partial updates */
export async function patchFamilyDetails(
    ocId: string,
    family: Partial<FamilyMember>[]
) {
    return api.patch(endpoints.oc.family(ocId), { family });
}

