// src/app/lib/api/ocApi.ts
import { api } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";

/** Course object */
export interface Course {
  id: string;
  code: string;
  title: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CourseRef {
  id: string;
  code: string;
  title?: string;
}

export interface PlatoonRef {
  id: string;
  key: string;
  name: string;
}

/** Base OC row from oc_cadets */
export interface OCRecord {
  id: string;
  photo: File;
  name: string;
  ocNo: string;
  uid?: string;
  branch?: "E" | "M" | "O" | null; // FIXED: Changed "C" to "O"
  platoonId?: string | null;
  arrivalAtUniversity: string;
  withdrawnOn?: string | null;
  createdAt?: string;
  course?: CourseRef;
  platoon?: PlatoonRef;
  courseId?: string;
}

/** Optional denormalized fields the list API now returns */
export interface OCDenorm {
  course?: Course;
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
  ssbReports?: Array<Record<string, unknown>>; // includes points[] in each report
  medicals?: Record<string, unknown>[];
  medicalCategory?: Record<string, unknown>[];
  discipline?: Record<string, unknown>[];
  parentComms?: Record<string, unknown>[];
  delegations?: Record<string, unknown>[];
}

/**
 * All possible query params supported by /api/v1/oc
 */
export interface FetchOCParams {
  /** quick text search on name/ocNo */
  q?: string;
  /** alias for q */
  query?: string;
  /** filter by course */
  courseId?: string;
  /** filter by platoon (id or key) */
  platoon?: string;
  /** filter by platoon */
  platoonId?: string;
  /** filter by branch - FIXED: Changed "C" to "O" */
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
  /** list ordering */
  sort?: "name_asc" | "updated_desc" | "created_asc";

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

export type ListEnvelope<T> = {
  status: number;
  ok: boolean;
  items: T[];
  count: number;
};

export type BulkUploadResult = {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
};

/**
 * Build query params for /api/v1/oc from FetchOCParams.
 * Kept internal so both helpers share identical behavior.
 */
function buildOCQuery(params: FetchOCParams = {}): Record<string, string> {
  const query: Record<string, string> = {};
  const normalized: FetchOCParams = { ...params };

  if (!normalized.q && normalized.query) {
    normalized.q = normalized.query;
  }
  if (normalized.q) {
    normalized.query = undefined;
  }
  if (!normalized.platoon && normalized.platoonId) {
    normalized.platoon = normalized.platoonId;
  }
  if (normalized.platoon) {
    normalized.platoonId = undefined;
  }

  for (const [k, v] of Object.entries(normalized)) {
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

  return query;
}

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
 * Fetch OC list with optional filters, returning the full list envelope
 * including `items` and total `count`. Use this for server-side pagination.
 */
export async function fetchOCsWithCount<
  T extends OCListRow | FullOCRecord = OCListRow
>(params: FetchOCParams = {}): Promise<ListEnvelope<T>> {
  const query = buildOCQuery(params);

  return api.get<ListEnvelope<T>>(endpoints.oc.list, {
    baseURL,
    query,
  });
}

/**
 * Fetch OC list with optional filters.
 * When `params.full === true`, returns the full graph per OC.
 * Otherwise returns list rows with denormalized fields.
 *
 * This helper returns only the `items` array for convenience and
 * backward compatibility. Use `fetchOCsWithCount` when you also
 * need the total `count` for pagination.
 */
export async function fetchOCs<
  T extends OCListRow | FullOCRecord = OCListRow
>(params: FetchOCParams = {}): Promise<T[]> {
  const res = await fetchOCsWithCount<T>(params);
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

/** Fetch OC by ID  */
export async function fetchOCById(ocId: string): Promise<OCListRow | null> {
  try {
    const res = await api.get<{ oc: OCListRow }>(
      endpoints.oc.getById(ocId),
      { baseURL }
    );
    return res.oc;
  } catch (err) {
    return null;
  }
}
