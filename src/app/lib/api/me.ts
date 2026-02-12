import { api, ApiClientError } from "@/app/lib/apiClient";
import { baseURL } from "@/constants/endpoints";

export interface MeResponse {
    status: number;
    ok: boolean;
    user: {
        id: string;
        username: string;
        email: string;
        phone: string;
        name: string;
        rank: string;
        currentAppointmentId: string | null;
    };
    roles: string[];
    permissions?: string[];
    deniedPermissions?: string[];
    policyVersion?: number | null;
    apt: {
        id: string;
        position: string;
        scope: {
            type: string;
            id: string | null;
        };
        valid_from: string;
        valid_to: string | null;
    };
}

export async function fetchMe(): Promise<MeResponse> {
    try {
        const response = await api.get<MeResponse>("/api/v1/me", { baseURL });
        return response;
    } catch (error) {
        if (error instanceof ApiClientError) {
            throw new Error(error.message || "Failed to load user dashboard data.");
        }
        throw new Error("Unexpected error fetching /me.");
    }
}
