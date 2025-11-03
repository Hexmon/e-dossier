
import { endpoints } from "@/constants/endpoints";
import { api } from "../apiClient";

export interface OCPersonalRecord {
  id: string;
  ocId: string;
  date: string;
  rk: string;
  name: string;
  appointment: string;
  remarks: string;
  initials: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Fetch personal inspection data for one OC
 */
export async function getOCInsp(ocId: string): Promise<OCPersonalRecord[]> {
  const response = await api.get<{ personals: OCPersonalRecord[] }>(
    endpoints.oc.personal(ocId),
    { path: { ocId } }
  );
  return response.personals;
}

/**
 * Create a new personal inspection entry
 */
export async function createOCInsp(
  ocId: string,
  body: Omit<OCPersonalRecord, "id" | "createdAt" | "updatedAt" | "ocId">
): Promise<OCPersonalRecord> {
  const response = await api.post<{ personal: OCPersonalRecord }>(
    endpoints.oc.personal(ocId),
    body,
    { path: { ocId } }
  );
  return response.personal;
}
