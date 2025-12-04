// lib/api/training-camps-client.ts

import { api } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";

// ============================================================================
// TYPES
// ============================================================================

export interface TrainingCamp {
    id: string;
    name: string;
    semester: string;
    maxTotalMarks: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface TrainingCampActivity {
    id: string;
    trainingCampId: string;
    name: string;
    defaultMaxMarks: number;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface TrainingCampWithActivities extends TrainingCamp {
    activities: TrainingCampActivity[];
}

// Query params
export interface ListCampsParams {
    semester?: string;
    includeActivities?: boolean;
    includeDeleted?: boolean;
}

export interface GetCampParams {
    includeActivities?: boolean;
    includeDeleted?: boolean;
}

export interface ListActivitiesParams {
    includeDeleted?: boolean;
}

// Input types
export interface CreateCampInput {
    name: string;
    semester: string;
    maxTotalMarks: number;
}

export interface UpdateCampInput {
    name?: string;
    semester?: string;
    maxTotalMarks?: number;
}

export interface CreateActivityInput {
    name: string;
    defaultMaxMarks: number;
    sortOrder?: number;
}

export interface UpdateActivityInput {
    name?: string;
    defaultMaxMarks?: number;
    sortOrder?: number;
}

// Response types
export interface ListCampsResponse {
    items: TrainingCamp[] | TrainingCampWithActivities[];
    count: number;
}

export interface ListActivitiesResponse {
    items: TrainingCampActivity[];
    count: number;
}

// ============================================================================
// TRAINING CAMPS API
// ============================================================================

/**
 * List all training camps with optional filters
 */
export async function listTrainingCamps(
    params?: ListCampsParams
): Promise<ListCampsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.semester) queryParams.set('semester', params.semester);
    if (params?.includeActivities) queryParams.set('includeActivities', 'true');
    if (params?.includeDeleted) queryParams.set('includeDeleted', 'true');

    const queryString = queryParams.toString();
    const url = queryString 
        ? `${endpoints.trainingCamps.list}?${queryString}`
        : endpoints.trainingCamps.list;

    const res = await api.get<ListCampsResponse>(url);
    return res;
}

/**
 * Get a single training camp by ID
 */
export async function getTrainingCamp(
    campId: string,
    params?: GetCampParams
): Promise<TrainingCamp | TrainingCampWithActivities> {
    const queryParams = new URLSearchParams();
    if (params?.includeActivities) queryParams.set('includeActivities', 'true');
    if (params?.includeDeleted) queryParams.set('includeDeleted', 'true');

    const queryString = queryParams.toString();
    const url = queryString
        ? `${endpoints.trainingCamps.detail(campId)}?${queryString}`
        : endpoints.trainingCamps.detail(campId);

    const res = await api.get<{ trainingCamp: TrainingCamp | TrainingCampWithActivities }>(url);
    
    if ('trainingCamp' in res) return res.trainingCamp;
    return res as unknown as TrainingCamp;
}

/**
 * Create a new training camp
 */
export async function createTrainingCamp(
    body: CreateCampInput
): Promise<TrainingCamp> {
    const response = await api.post<{ trainingCamp: TrainingCamp }>(
        endpoints.trainingCamps.list,
        body,
        { baseURL }
    );

    if ('trainingCamp' in response) return response.trainingCamp;
    return response as unknown as TrainingCamp;
}

/**
 * Update an existing training camp
 */
export async function updateTrainingCamp(
    campId: string,
    body: UpdateCampInput
): Promise<TrainingCamp> {
    const response = await api.patch<{ trainingCamp: TrainingCamp }>(
        endpoints.trainingCamps.detail(campId),
        body
    );

    if ('trainingCamp' in response) return response.trainingCamp;
    return response as unknown as TrainingCamp;
}

/**
 * Delete a training camp (soft or hard delete)
 */
export async function deleteTrainingCamp(
    campId: string,
    hardDelete?: boolean
): Promise<{ deleted: string; hardDeleted: boolean }> {
    const body: Record<string, unknown> | undefined = hardDelete ? { hard: true } : undefined;
    
    const response = await api.delete<{ deleted: string; hardDeleted: boolean }>(
        endpoints.trainingCamps.detail(campId),
        body
    );

    return response;
}

// ============================================================================
// TRAINING CAMP ACTIVITIES API
// ============================================================================

/**
 * List all activities for a specific training camp
 */
export async function listTrainingCampActivities(
    campId: string,
    params?: ListActivitiesParams
): Promise<ListActivitiesResponse> {
    const queryParams = new URLSearchParams();
    if (params?.includeDeleted) queryParams.set('includeDeleted', 'true');

    const queryString = queryParams.toString();
    const url = queryString
        ? `${endpoints.trainingCamps.activities(campId)}?${queryString}`
        : endpoints.trainingCamps.activities(campId);

    const res = await api.get<ListActivitiesResponse>(url);
    return res;
}

/**
 * Get a single training camp activity by ID
 */
export async function getTrainingCampActivity(
    campId: string,
    activityId: string
): Promise<TrainingCampActivity> {
    const res = await api.get<{ activity: TrainingCampActivity }>(
        endpoints.trainingCamps.activity(campId, activityId)
    );

    if ('activity' in res) return res.activity;
    return res as unknown as TrainingCampActivity;
}

/**
 * Create a new activity for a training camp
 */
export async function createTrainingCampActivity(
    campId: string,
    body: CreateActivityInput
): Promise<TrainingCampActivity> {
    const response = await api.post<{ activity: TrainingCampActivity }>(
        endpoints.trainingCamps.activities(campId),
        body,
        { baseURL }
    );

    if ('activity' in response) return response.activity;
    return response as unknown as TrainingCampActivity;
}

/**
 * Update an existing training camp activity
 */
export async function updateTrainingCampActivity(
    campId: string,
    activityId: string,
    body: UpdateActivityInput
): Promise<TrainingCampActivity> {
    const response = await api.patch<{ activity: TrainingCampActivity }>(
        endpoints.trainingCamps.activity(campId, activityId),
        body
    );

    if ('activity' in response) return response.activity;
    return response as unknown as TrainingCampActivity;
}

/**
 * Delete a training camp activity (soft or hard delete)
 */
export async function deleteTrainingCampActivity(
    campId: string,
    activityId: string,
    hardDelete?: boolean
): Promise<{ deleted: string; hardDeleted: boolean }> {
    const body: Record<string, unknown> | undefined = hardDelete ? { hard: true } : undefined;
    
    const response = await api.delete<{ deleted: string; hardDeleted: boolean }>(
        endpoints.trainingCamps.activity(campId, activityId),
        body
    );

    return response;
}
