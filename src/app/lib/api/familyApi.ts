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

export interface ApiResponse<T = any> {
    status: number;
    ok?: boolean;
    data?: T;
}

/** Save or update all family members for a cadet */
export async function saveFamilyDetails(
    ocId: string,
    family: FamilyMember[]
): Promise<ApiResponse[]> {
    const responses: ApiResponse[] = [];

    try {
        for (const member of family) {
            const payload = {
                ...member,
                mobileNo: member.mobile,
                age: member.age ? Number(member.age) : undefined,
            };

            const response = (await api.post(
                endpoints.oc.family(ocId),
                payload
            )) as ApiResponse;

            responses.push(response);
        }

        return responses;
    } catch (error: any) {
        console.error("Error saving family details:", error);
        return [];
    }
}
