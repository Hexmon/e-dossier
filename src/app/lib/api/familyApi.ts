import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

export interface FamilyMember {
    name: string;
    relation: string;
    age?: string | number;
    occupation?: string;
    education?: string;
    mobile?: string;
}


/** Save or update all family members for a cadet */
export async function saveFamilyDetails(ocId: string, family: FamilyMember[]) {
    for (const member of family) {
        const payload = {
            ...member,
            mobileNo: member.mobile,
            age: member.age ? Number(member.age) : undefined,
        };

        await api.post(endpoints.oc.family(ocId), payload);
    }
}


/** Optionally patch partial updates */
export async function patchFamilyDetails(
    ocId: string,
    family: Partial<FamilyMember>[]
) {
    return api.patch(endpoints.oc.family(ocId), { family });
}

