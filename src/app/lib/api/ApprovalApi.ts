import { api } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";

export interface PendingUser {
  id: string;
  username: string;
  name: string;
  rank: string;
  email: string;
  phone: string;
  unit?: string;
  note?: string;
  desiredPositionName?: string;
}

export interface PositionSlot {
  position: {
    id: string;
    key: string;
    displayName: string;
  };
  scope: {
    type: string;
    id: string | null;
    name: string | null;
  };
  occupied: boolean;
  occupant: string | null;
}

interface PendingUserResponse {
  status: number;
  ok: boolean;
  items: PendingUser[];
}

interface SlotResponse {
  status: number;
  ok: boolean;
  count: number;
  slots: PositionSlot[];
}

interface ApproveResponse {
  status: number;
  ok: boolean;
  message: string;
  appointment: {
    id: string;
    userId: string;
    positionId: string;
    scopeType: string;
    scopeId: string | null;
    startsAt: string;
    endsAt: string | null;
  };
  granted_roles: string[];
}

interface RejectResponse {
  status: number;
  ok: boolean;
  message: string;
}

// 🔹 Fetch all pending users
export async function getPendingUsers(): Promise<PendingUser[]> {
  const response = await api.get<PendingUserResponse>(endpoints.admin.approval, {
    baseURL,
    query: { status: "pending", limit: 50 },
  });
  return response.items || [];
}

// 🔹 Fetch all available appointment slots
export async function getAvailableSlots(): Promise<PositionSlot[]> {
  const response = await api.get<SlotResponse>(endpoints.admin.slots, { baseURL });
  return response.slots || [];
}

// 🔹 Approve user signup request
export async function approveSignupRequest(
  requestId: string,
  positionId: string
): Promise<ApproveResponse> {
  const response = await api.post<ApproveResponse>(
    `${endpoints.admin.approval}/${requestId}/approve`,
    { positionId },
    { baseURL }
  );
  return response;
}

// 🔹 Reject user signup request
export async function rejectSignupRequest(requestId: string): Promise<RejectResponse> {
  const response = await api.post<RejectResponse>(
    `${endpoints.admin.approval}/${requestId}/reject`,
    {},
    { baseURL }
  );
  return response;
}
