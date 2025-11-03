import { api } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";

export interface OCRecord {
    id: string;
    name: string;
    ocNo: string;
    uid?: string;
    courseId: string;
    branch?: "E" | "M" | "O" | null;
    platoonId?: string | null;
    arrivalAtUniversity: string;
    withdrawnOn?: string | null;
    createdAt?: string;
}

interface OCListResponse {
    status: number;
    ok: boolean;
    items: OCRecord[];
    count: number;
}

export interface FetchOCParams {
    active?: boolean;
    courseId?: string;
    q?: string;
}

/**
 * Fetch all OCs (optionally filtered by query)
 * GET {{baseURL}}/api/v1/oc
 */
export async function getAllOCs(query?: string): Promise<OCRecord[]> {
  const params: Record<string, string> = {};

  if (query) {
    params.q = query;
  }

  const response = await api.get<OCListResponse>(endpoints.oc.list, {
    baseURL,
    query: params,
  });

  return response.items;
}


/**
 * Fetch OC list with optional filters
 * GET {{baseURL}}/api/v1/oc?active=true&courseId={{courseId}}&q={{q}}
 */
export async function fetchOCs(params: FetchOCParams = {}): Promise<OCRecord[]> {
    const query: Record<string, string> = {};

    if (params.active !== undefined) query.active = String(params.active);
    if (params.courseId) query.courseId = params.courseId;
    if (params.q) query.q = params.q;

    const res = await api.get<OCListResponse>(endpoints.oc.list, {
        baseURL,
        query,
    });

    return res.items;
}


/**
 * Create a new OC
 * POST {{baseURL}}/api/v1/oc
 */
export async function createOC(body: Omit<OCRecord, "id" | "uid" | "createdAt">): Promise<OCRecord> {
    const response = await api.post<{ oc: OCRecord }, typeof body>(endpoints.oc.create, body, {
        baseURL,
    });

    return response.oc;
}

/**
 * Update an OC by ID
 * PUT {{baseURL}}/api/v1/oc/:id
 */
export async function updateOC(id: string, body: Partial<OCRecord>): Promise<OCRecord> {
    const response = await api.patch<{ oc: OCRecord }, Partial<OCRecord>>(endpoints.oc.update(id), body, {
        baseURL,
    });

    return response.oc;
}

/**
 * Delete an OC
 * DELETE {{baseURL}}/api/v1/oc/:id
 */
export async function deleteOC(id: string): Promise<void> {
    await api.delete(endpoints.oc.delete(id), { baseURL });
}

