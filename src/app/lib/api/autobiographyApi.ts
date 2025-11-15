import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

export interface AutoBio {
    general: string;
    sportsProficiency: string;
    achievementsNote?: string;
    areasToWork: string;
    additionalInfo: string;
    filledOn: string;
    platoonCommanderName: string;
    sign_oc: string;
    sign_pi: string;
}

export interface ApiResponse<T = any> {
    status: number;
    ok?: boolean;
    data?: T;
}

export interface AutoBioPayload {
    general: string;
    sportsProficiency: string;
    achievementsNote: string;
    areasToWork: string;
    additionalInfo: string;
    filledOn: string;
    platoonCommanderName: string;
}


export async function saveAutobiography(
    ocId: string,
    autobiography: AutoBioPayload
): Promise<ApiResponse> {
    try {
        const response = (await api.post(
            endpoints.oc.autobiography(ocId),
            autobiography
        )) as ApiResponse;

        return response;
    } catch (error: any) {
        console.error("Error saving autobiography:", error);
        return { ok: false, status: error?.response?.status || 500 };
    }
}

export async function getAutobiographyDetails(ocId: string): Promise<AutoBio | null> {
    try {
        const response = await api.get<{ data?: AutoBio }>(endpoints.oc.autobiography(ocId));
        console.log("Autobiography API response:", response);

        if (response?.data) {
            return response.data;
        }

        return null;
    } catch (error) {
        console.error("Error fetching autobiography:", error);
        return null;
    }
}
