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
    workflowAssignments?: Array<{
        module: "ACADEMICS_BULK" | "PT_BULK";
        actorTypes: Array<"DATA_ENTRY" | "VERIFICATION">;
    }>;
    workflowModules?: {
        ACADEMICS_BULK: { isActive: boolean };
        PT_BULK: { isActive: boolean };
    };
    moduleAccess?: {
        canAccessDossier: boolean;
        canAccessBulkUpload: boolean;
        canAccessReports: boolean;
        canAccessAcademicsBulk: boolean;
        canAccessPtBulk: boolean;
    };
    authority?: {
        kind: "APPOINTMENT" | "DELEGATION";
        delegationId: string | null;
        grantorUserId: string | null;
        grantorUsername: string | null;
    };
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
        auth_kind?: "APPOINTMENT" | "DELEGATION";
        delegation_id?: string | null;
        source_appointment_id?: string | null;
        grantor_user_id?: string | null;
        grantor_username?: string | null;
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
