import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

export interface FamilyMember {
    name: string;
    relation: string;
    age?: string | number;
    occupation?: string;
    education?: string;
    mobileNo?: string;
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
        return [];
    }
}

export async function getFamilyDetails(ocId: string): Promise<FamilyMember[]> {
    try {
        const response = await api.get(endpoints.oc.family(ocId)) as any;
        if (Array.isArray(response?.items)) {
            return response.items;
        }
        return [];
    } catch (error) {
        return [];
    }
}
