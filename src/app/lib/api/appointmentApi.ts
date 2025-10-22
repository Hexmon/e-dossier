import { api } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";

export interface Appointment {
  id: string;
  userId: string;
  username: string;
  positionId: string;
  positionKey: string;
  positionName: string;
  scopeType: string;
  scopeId: string | null;
  platoonKey: string | null;
  platoonName: string | null;
  startsAt: string;
  endsAt: string | null;
  reason: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AppointmentResponse {
  status: number;
  ok: boolean;
  data: Appointment[];
}

export async function getAppointments(): Promise<Appointment[]> {
  const response = await api.get<AppointmentResponse>(
    endpoints.admin.appointments,
    { baseURL }
  );

  return response.data;
}


/*--------------------Transfer appointment------------------*/

export interface TransferPayload {
  newUserId: string;
  prevEndsAt: string;
  newStartsAt: string;
  reason: string;
}

export interface TransferResponse {
  status: number;
  ok: boolean;
  message?: string;
}

export async function transferAppointment(
  appointmentId: string,
  payload: TransferPayload
): Promise<TransferResponse> {
  try {
    const response = await api.post<TransferResponse>(
      endpoints.admin.transferappt(appointmentId),
      payload,
      { baseURL }
    );
    return response;
  } catch (error: any) {
    console.error("Failed to transfer appointment:", error);
    throw new Error(
      error.message || "Failed to transfer appointment. Please try again."
    );
  }
}