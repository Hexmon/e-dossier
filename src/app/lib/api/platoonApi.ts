import { api } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";

export interface Platoon {
  id: string;
  key: string;
  name: string;
  about: string | null;
  themeColor: string;
  imageUrl: string | null;
  imageObjectKey: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PlatoonCreatePayload {
  key: string;
  name: string;
  about?: string | null;
  themeColor?: string;
  imageUrl?: string | null;
  imageObjectKey?: string | null;
}

export interface PlatoonUpdatePayload {
  name?: string;
  about?: string | null;
  themeColor?: string;
  imageUrl?: string | null;
  imageObjectKey?: string | null;
}

interface PlatoonResponse {
  status: number;
  ok: boolean;
  items: Platoon[];
}

interface SinglePlatoonResponse {
  status: number;
  ok: boolean;
  platoon: Platoon;
}

export type PlatoonImagePresignPayload = {
  platoonKey: string;
  contentType: "image/png" | "image/jpeg" | "image/webp";
  sizeBytes: number;
};

export type PlatoonImagePresignResponse = {
  uploadUrl: string;
  publicUrl: string;
  objectKey: string;
  expiresInSeconds: number;
};

export type PlatoonCommanderHistoryItem = {
  appointmentId: string;
  userId: string;
  username: string;
  name: string;
  rank: string;
  assignment: "PRIMARY" | "OFFICIATING";
  startsAt: string;
  endsAt: string | null;
  status: "CURRENT" | "PREVIOUS";
};

export type PlatoonCommanderHistoryResponse = {
  message: string;
  platoon: { id: string; key: string; name: string };
  items: PlatoonCommanderHistoryItem[];
};

export async function getPlatoons(): Promise<Platoon[]> {
  const response = await api.get<PlatoonResponse>(endpoints.admin.platoons, { baseURL });
  return response.items ?? [];
}

export async function fetchPlatoonByKey(key: string): Promise<Platoon> {
  if (!key) throw new Error("Missing platoon key");

  const response = await api.get<PlatoonResponse>(endpoints.admin.platoons, {
    baseURL,
    query: { q: key },
  });

  const { items = [] } = response;

  if (items.length === 0) {
    throw new Error("Platoon not found");
  }

  return items[0];
}

export async function createPlatoon(payload: PlatoonCreatePayload): Promise<Platoon> {
  const response = await api.post<SinglePlatoonResponse, PlatoonCreatePayload>(
    endpoints.admin.platoons,
    payload,
    { baseURL }
  );

  return response.platoon;
}

export async function updatePlatoon(key: string, payload: PlatoonUpdatePayload): Promise<Platoon> {
  if (!key) throw new Error("Missing platoon key");

  const response = await api.patch<SinglePlatoonResponse, PlatoonUpdatePayload>(
    `${endpoints.admin.platoons}/${key}`,
    payload,
    { baseURL }
  );

  return response.platoon;
}

export async function deletePlatoon(id: string): Promise<void> {
  if (!id) throw new Error("Missing platoon ID");

  await api.delete(`${endpoints.admin.platoons}/${id}`, { baseURL });
}

export async function presignPlatoonImage(
  payload: PlatoonImagePresignPayload
): Promise<PlatoonImagePresignResponse> {
  return api.post<PlatoonImagePresignResponse, PlatoonImagePresignPayload>(
    endpoints.admin.platoonImagePresign,
    payload,
    { baseURL }
  );
}

export async function getPlatoonCommanderHistory(idOrKey: string): Promise<PlatoonCommanderHistoryResponse> {
  if (!idOrKey) throw new Error("Missing platoon identifier");

  return api.get<PlatoonCommanderHistoryResponse>(
    endpoints.admin.platoonCommanderHistory(encodeURIComponent(idOrKey)),
    { baseURL }
  );
}
