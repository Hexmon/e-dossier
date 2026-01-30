import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

export interface Appointment {
    id: string;
    userId: string;
    username: string;
    positionId: string;
    positionKey: string;
    positionName: string;
    scopeType: string;
    scopeId: string;
    platoonKey: string;
    platoonName: string;
    startsAt: string;
    endsAt: string | null;
    reason: string;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ListAppointmentsParams {
    userId?: string;
    active?: boolean;
    [key: string]: string | number | boolean | undefined;
}

export async function listAppointments(
    params?: ListAppointmentsParams
): Promise<{ appointments: Appointment[] }> {
    const response = await api.get<{ data: Appointment[] }>(
        "/api/v1/admin/appointments",
        {
            query: params as Record<string, string | number | boolean | undefined>,
        }
    );
    return { appointments: response.data || [] };
}