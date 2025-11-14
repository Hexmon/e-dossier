// src/app/lib/api/ocApi.ts
import { api } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";

/** Base OC row from oc_cadets */
export interface OCRecord {
  id: string;
  name: string;
  ocNo: string;
  uid?: string;
  courseId: string;
  branch?: "E" | "M" | "O" | null;
  platoonId?: string | null;
  arrivalAtUniversity: string; // ISO string
  withdrawnOn?: string | null;
  createdAt?: string;
}

/** Optional denormalized fields the list API now returns */
export interface OCDenorm {
  courseCode?: string;
  courseTitle?: string;
  platoonKey?: string | null;
  platoonName?: string | null;

  status?: "ACTIVE" | "DELEGATED" | "WITHDRAWN" | "PASSED_OUT";
  managerUserId?: string | null;
  relegateToCourseId?: string | null;
  relegatedOn?: string | null;
  updatedAt?: string;
}

/** Full graph shape when full=true */
export interface FullOCRecord extends OCListRow {
  personal?: Record<string, unknown> | null;
  preCommission?: Record<string, unknown> | null;
  commissioning?: Record<string, unknown> | null;
  autobiography?: Record<string, unknown> | null;

  familyMembers?: Record<string, unknown>[];
  education?: Record<string, unknown>[];
  achievements?: Record<string, unknown>[];
  ssbReports?: Array<Record<string, unknown>>; // includes points[] in each report
  medicals?: Record<string, unknown>[];
  medicalCategory?: Record<string, unknown>[];
  discipline?: Record<string, unknown>[];
  parentComms?: Record<string, unknown>[];
  delegations?: Record<string, unknown>[];
}

export interface FetchOCParams {
  /** quick text search on name/ocNo */
  q?: string;
  /** filter by course */
  courseId?: string;
  /** filter by platoon */
  platoonId?: string;
  /** filter by branch */
  branch?: "O" | "E" | "M";
  /** filter by status enum */
  status?: "ACTIVE" | "DELEGATED" | "WITHDRAWN" | "PASSED_OUT";
  /** shorthand for withdrawnOn IS NULL */
  active?: boolean;
  /** arrival date range filters (ISO) */
  arrivalFrom?: string;
  arrivalTo?: string;
  /** pagination */
  limit?: number;
  offset?: number;
  /** return the full graph */
  full?: boolean;
}

export type BulkUploadResult = {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
};

/**
 * Fetch all OCs (simple helper over fetchOCs)
 * GET {{baseURL}}/api/v1/oc
 */
export async function getAllOCs(query?: string): Promise<OCListRow[]> {
  const params: Record<string, string> = {};
  if (query) params.q = query;
  const res = await api.get<ListEnvelope<OCListRow>>(endpoints.oc.list, {
    baseURL,
    query: params,
  });
  return res.items;
}

/**
 * Fetch OC list with optional filters.
 * When `params.full === true`, returns the full graph per OC.
 * Otherwise returns list rows with denormalized fields.
 */

/** Base OC row from oc_cadets */
export interface OCRecord {
  id: string;
  name: string;
  ocNo: string;
  uid?: string;
  courseId: string;
  branch?: "E" | "M" | "O" | null;
  platoonId?: string | null;
  arrivalAtUniversity: string; // ISO string
  withdrawnOn?: string | null;
  createdAt?: string;
}

/** Optional denormalized fields the list API now returns */
export interface OCDenorm {
  courseCode?: string;
  courseTitle?: string;
  platoonKey?: string | null;
  platoonName?: string | null;

  status?: "ACTIVE" | "DELEGATED" | "WITHDRAWN" | "PASSED_OUT";
  managerUserId?: string | null;
  relegateToCourseId?: string | null;
  relegatedOn?: string | null;
  updatedAt?: string;
}

/** Basic list row shape (cadet + denorm) */
export type OCListRow = OCRecord & OCDenorm;

/** Full graph shape when full=true */
export interface FullOCRecord extends OCListRow {
  personal?: Record<string, unknown> | null;
  preCommission?: Record<string, unknown> | null;
  commissioning?: Record<string, unknown> | null;
  autobiography?: Record<string, unknown> | null;

  familyMembers?: Record<string, unknown>[];
  education?: Record<string, unknown>[];
  achievements?: Record<string, unknown>[];
  ssbReports?: Array<Record<string, unknown>>;
  medicals?: Record<string, unknown>[];
  medicalCategory?: Record<string, unknown>[];
  discipline?: Record<string, unknown>[];
  parentComms?: Record<string, unknown>[];
  delegations?: Record<string, unknown>[];
}

type ListEnvelope<T> = {
  status: number;
  ok: boolean;
  items: T[];
  count: number;
};

/**
 * All possible query params supported by /api/v1/oc
 */
export interface FetchOCParams {
  /** quick text search on name/ocNo */
  q?: string;
  /** filter by course */
  courseId?: string;
  /** filter by platoon */
  platoonId?: string;
  /** filter by branch */
  branch?: "O" | "E" | "M";
  /** filter by status enum */
  status?: "ACTIVE" | "DELEGATED" | "WITHDRAWN" | "PASSED_OUT";
  /** shorthand for withdrawnOn IS NULL */
  active?: boolean;
  /** arrival date range filters (ISO) */
  arrivalFrom?: string;
  arrivalTo?: string;
  /** pagination */
  limit?: number;
  offset?: number;

  /** return the full graph (all sections) */
  full?: boolean;

  /**
   * "include" style – eg:
   * include=personal,delegations
   */
  include?: string | string[];

  /** fine-grained section toggles */
  personal?: boolean;
  preCommission?: boolean;
  commissioning?: boolean;
  autobiography?: boolean;
  familyMembers?: boolean;
  education?: boolean;
  achievements?: boolean;
  ssbReports?: boolean;
  medicals?: boolean;
  medicalCategory?: boolean;
  discipline?: boolean;
  parentComms?: boolean;
  delegations?: boolean;
}

/**
 * Fetch OC list with optional filters.
 * When `params.full === true`, returns the full graph per OC.
 * Otherwise returns list rows with denormalized fields.
 */
export async function fetchOCs<
  T extends OCListRow | FullOCRecord = OCListRow
>(params: FetchOCParams = {}): Promise<T[]> {
  const query: Record<string, string> = {};

  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;

    // special handling for include (can be string or string[])
    if (k === "include") {
      if (Array.isArray(v) && v.length > 0) {
        query.include = v.join(",");
      } else if (typeof v === "string" && v.trim()) {
        query.include = v.trim();
      }
      continue;
    }

    query[k] = String(v);
  }

  const res = await api.get<ListEnvelope<T>>(endpoints.oc.list, {
    baseURL,
    query,
  });

  return res.items;
}


/** Convenience: fetch one OC by id with full graph */
export async function fetchOCByIdFull(id: string): Promise<FullOCRecord | null> {
  const rows = await fetchOCs<FullOCRecord>({ id, full: true, limit: 1 } as any);
  return rows[0] ?? null;
}

/**
 * Create a new OC
 * POST {{baseURL}}/api/v1/oc
 */
export async function createOC(
  body: Omit<OCRecord, "id" | "uid" | "createdAt">
): Promise<OCRecord> {
  const response = await api.post<{ oc: OCRecord }, typeof body>(
    endpoints.oc.create,
    body,
    { baseURL }
  );
  return response.oc;
}

/**
 * Update an OC by ID
 * PATCH {{baseURL}}/api/v1/oc/:id
 */
export async function updateOC(
  id: string,
  body: Partial<OCRecord>
): Promise<OCRecord> {
  const response = await api.patch<{ oc: OCRecord }, Partial<OCRecord>>(
    endpoints.oc.update(id),
    body,
    { baseURL }
  );
  return response.oc;
}

/**
 * Delete an OC
 * DELETE {{baseURL}}/api/v1/oc/:id
 */
export async function deleteOC(id: string): Promise<void> {
  await api.delete(endpoints.oc.delete(id), { baseURL });
}

/**
 * Bulk upload OCs from parsed rows.
 * POST {{baseURL}}/api/v1/oc/bulk-upload
 * Body: { rows: Array<Record<string, unknown>> }
 */
export async function bulkUploadOCs(
  rows: Array<Record<string, unknown>>
): Promise<BulkUploadResult> {
  return api.post<BulkUploadResult, { rows: Array<Record<string, unknown>> }>(
    endpoints.oc.bulkUpload,
    { rows },
    { baseURL }
  );
}

/**
 * Bulk validate (dry-run) without inserting.
 * POST {{baseURL}}/api/v1/oc/bulk-upload?dryRun=1
 */
export async function bulkValidateOCs(
  rows: Array<Record<string, unknown>>
): Promise<BulkUploadResult> {
  return api.post<BulkUploadResult, { rows: Array<Record<string, unknown>> }>(
    `${endpoints.oc.bulkUpload}?dryRun=1`,
    { rows },
    { baseURL }
  );
}