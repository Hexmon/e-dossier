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
