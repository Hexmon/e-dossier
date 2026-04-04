import { api } from "@/app/lib/apiClient";
import { baseURL } from "@/constants/endpoints";

export type PlatoonScopedCadet = {
  id: string;
  name: string;
  ocNo: string;
  status: string;
};

export type PlatoonCadetAppointment = {
  id: string;
  cadetId: string;
  cadetName: string;
  cadetOcNo: string;
  platoonId: string;
  platoonName: string;
  appointmentName: string;
  startsAt: string;
  endsAt: string | null;
  reason: string | null;
  appointedByName: string | null;
  endedByName: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlatoonCadetAppointmentsDashboard = {
  platoon: {
    id: string;
    key: string;
    name: string;
  };
  cadets: PlatoonScopedCadet[];
  activeAppointments: PlatoonCadetAppointment[];
  historyAppointments: PlatoonCadetAppointment[];
};

type DashboardResponse = PlatoonCadetAppointmentsDashboard & {
  message: string;
};

type SingleAppointmentResponse = {
  message: string;
  data: PlatoonCadetAppointment;
};

type TransferResponse = {
  message: string;
  endedAppointment: PlatoonCadetAppointment;
  newAppointment: PlatoonCadetAppointment;
};

export type CreateCadetAppointmentPayload = {
  cadetId: string;
  appointmentName: string;
  startsAt: string;
  reason?: string;
};

export type UpdateCadetAppointmentPayload = {
  cadetId?: string;
  appointmentName?: string;
  startsAt?: string;
  endsAt?: string | null;
  reason?: string | null;
};

export type TransferCadetAppointmentPayload = {
  newCadetId: string;
  prevEndsAt: string;
  newStartsAt: string;
  reason?: string;
};

const ROOT = "/api/v1/pl-cdr/cadet-appointments";

export const platoonCadetAppointmentsApi = {
  getDashboard: () => api.get<DashboardResponse>(ROOT, { baseURL }),
  create: (payload: CreateCadetAppointmentPayload) =>
    api.post<SingleAppointmentResponse, CreateCadetAppointmentPayload>(
      ROOT,
      payload,
      { baseURL }
    ),
  update: (appointmentId: string, payload: UpdateCadetAppointmentPayload) =>
    api.patch<SingleAppointmentResponse, UpdateCadetAppointmentPayload>(
      `${ROOT}/${appointmentId}`,
      payload,
      { baseURL }
    ),
  remove: (appointmentId: string) =>
    api.delete<SingleAppointmentResponse>(`${ROOT}/${appointmentId}`, { baseURL }),
  transfer: (appointmentId: string, payload: TransferCadetAppointmentPayload) =>
    api.post<TransferResponse, TransferCadetAppointmentPayload>(
      `${ROOT}/${appointmentId}/transfer`,
      payload,
      { baseURL }
    ),
};
