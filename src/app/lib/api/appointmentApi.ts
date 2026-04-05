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
  data: Appointment[];
}

export async function getAppointments(): Promise<Appointment[]> {
  const response = await api.get<AppointmentResponse>(
    endpoints.admin.appointments,
    {
      baseURL,
      query: { active: true },
    }
  );

  return response.data;
}

export interface LoginAppointmentOption {
  id: string;
  username: string;
  positionId: string;
  positionKey: string;
  positionName: string;
  scopeType: string;
  scopeId: string | null;
  platoonKey: string | null;
  platoonName: string | null;
}

interface LoginAppointmentResponse {
  data: LoginAppointmentOption[];
}

export async function getLoginAppointments(): Promise<LoginAppointmentOption[]> {
  const response = await api.get<LoginAppointmentResponse>(
    endpoints.admin.appointments,
    {
      baseURL,
      query: { active: true },
    }
  );

  return response.data;
}

export type DashboardAppointmentHolder = {
  appointmentId: string;
  positionName: string | null;
  officerName: string | null;
  startsAt: string;
};

interface DashboardAppointmentsResponse {
  items: DashboardAppointmentHolder[];
}

export async function getDashboardAppointmentHolders(): Promise<DashboardAppointmentHolder[]> {
  const response = await api.get<DashboardAppointmentsResponse>(
    "/api/v1/dashboard/data/appointments",
    { baseURL }
  );

  return response.items;
}


/*--------------------Transfer appointment------------------*/

export interface TransferPayload {
  newUserId: string;
  prevEndsAt: string;
  newStartsAt: string;
  positionId: string;
  scopeType: string;
  scopeId: string | null;
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
    throw new Error(
      error.message || "Failed to transfer appointment. Please try again."
    );
  }
}


export interface CreateAppointmentPayload {
  userId: string;
  positionId: string;
  assignment?: 'PRIMARY' | 'OFFICIATING';
  scopeType?: 'GLOBAL' | 'PLATOON';
  scopeId?: string | null;
  startsAt: string;
  endsAt?: string | null;
  reason?: string;
}

export interface CreateAppointmentResponse {
  status: number;
  ok: boolean;
  message: string;
  data: Appointment;
}

export async function createAppointment(
  payload: CreateAppointmentPayload
): Promise<CreateAppointmentResponse> {
  try {
    const response = await api.post<CreateAppointmentResponse>(
      endpoints.admin.appointments,
      payload,
      { baseURL }
    );
    return response;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      "Failed to create appointment. Please try again."
    );
  }
}


export interface Position {
  id: string;
  key: string;
  displayName: string | null;
  defaultScope: 'GLOBAL' | 'PLATOON';
  singleton: boolean;
  description: string | null;
  createdAt: string;
}

export interface PositionsResponse {
  status: number;
  ok: boolean;
  message: string;
  data: Position[];
}

export async function getPositions(): Promise<Position[]> {
  try {
    const response = await api.get<PositionsResponse>(
      "/api/v1/admin/positions",
      { baseURL }
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.message || "Failed to fetch positions. Please try again."
    );
  }
}


export interface CreatePositionPayload {
  key: string;
  displayName: string;
  defaultScope?: 'GLOBAL' | 'PLATOON';
  singleton?: boolean;
  description?: string;
}

export interface CreatePositionResponse {
  status: number;
  ok: boolean;
  message: string;
  data: Position;
}

export async function createPosition(
  payload: CreatePositionPayload
): Promise<CreatePositionResponse> {
  try {
    const response = await api.post<CreatePositionResponse>(
      "/api/v1/admin/positions",
      payload,
      { baseURL }
    );
    return response;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      "Failed to create position. Please try again."
    );
  }
}

/*--------------------Update position------------------*/

export interface UpdatePositionPayload {
  displayName?: string;
}

export interface UpdatePositionResponse {
  status: number;
  ok: boolean;
  message: string;
  data: Position;
}

export async function updatePosition(
  positionId: string,
  payload: UpdatePositionPayload
): Promise<UpdatePositionResponse> {
  try {
    const response = await api.patch<UpdatePositionResponse>(
      `/api/v1/admin/positions/${positionId}`,
      payload,
      { baseURL }
    );
    return response;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      "Failed to update position. Please try again."
    );
  }
}

/*--------------------Update appointment------------------*/

export interface UpdateAppointmentPayload {
  userId?: string;
  username?: string;
  assignment?: 'PRIMARY' | 'OFFICIATING';
  scopeType?: 'GLOBAL' | 'PLATOON';
  scopeId?: string | null;
  startsAt?: string;
  endsAt?: string | null;
  reason?: string;
}

export interface UpdateAppointmentResponse {
  status: number;
  ok: boolean;
  message: string;
  data: Appointment;
}

export async function updateAppointment(
  appointmentId: string,
  payload: UpdateAppointmentPayload
): Promise<UpdateAppointmentResponse> {
  try {
    const response = await api.patch<UpdateAppointmentResponse>(
      `/api/v1/admin/appointments/${appointmentId}`,
      payload,
      { baseURL }
    );
    return response;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      "Failed to update appointment. Please try again."
    );
  }
}

/*--------------------Delete appointment------------------*/

export interface DeleteAppointmentResponse {
  status: number;
  ok: boolean;
  message: string;
  data: Appointment;
}

export async function deleteAppointment(
  appointmentId: string
): Promise<DeleteAppointmentResponse> {
  try {
    const response = await api.delete<DeleteAppointmentResponse>(
      `/api/v1/admin/appointments/${appointmentId}`,
      { baseURL }
    );
    return response;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      "Failed to delete appointment. Please try again."
    );
  }
}

/*--------------------Delete position------------------*/

export interface DeletePositionResponse {
  status: number;
  ok: boolean;
  message: string;
  data: Position;
}

export async function deletePosition(
  positionId: string
): Promise<DeletePositionResponse> {
  try {
    const response = await api.delete<DeletePositionResponse>(
      `/api/v1/admin/positions/${positionId}`,
      { baseURL }
    );
    return response;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      "Failed to delete position. Please try again."
    );
  }
}
