// lib/api/oc-camps-client.ts

import { api } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";

// ============================================================================
// TYPES
// ============================================================================

export interface OcCamp {
    id: string;
    ocId: string;
    trainingCampId: string;
    year: number;
    totalMarksScored: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    trainingCamp?: {
        id: string;
        name: string;
        semester: string;
        maxTotalMarks: number;
    };
    reviews?: OcCampReview[];
    activityScores?: OcCampActivityScore[];
}

export interface OcCampReview {
    id: string;
    ocCampId: string;
    role: string;
    sectionTitle: string;
    reviewText: string;
    createdAt: string;
    updatedAt: string;
}

export interface OcCampActivityScore {
    id: string;
    ocCampId: string;
    trainingCampActivityId: string;
    marksScored: number;
    remark: string | null;
    createdAt: string;
    updatedAt: string;
    activity?: {
        id: string;
        name: string;
        defaultMaxMarks: number;
    };
}

export interface OcCampQueryParams {
    semester?: string;
    campName?: string;
    withReviews?: boolean;
    withActivities?: boolean;
    reviewRole?: string;
    activityName?: string;
}

export interface UpsertOcCampInput {
    trainingCampId: string;
    year: number;
    reviews?: {
        role: string;
        sectionTitle: string;
        reviewText: string;
    }[];
    activities?: {
        trainingCampActivityId: string;
        marksScored: number;
        remark?: string | null;
    }[];
}

export interface UpdateOcCampInput extends UpsertOcCampInput {
    ocCampId?: string;
}

export interface OcCampsResponse {
    camps: OcCamp[];
    grandTotalMarksScored: number;
}

// ============================================================================
// OC CAMPS API
// ============================================================================

/**
 * Get all OC camps for a specific OC with optional filters
 */
export async function getOcCamps(
    ocId: string,
    params?: OcCampQueryParams
): Promise<OcCampsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.semester) queryParams.set('semester', params.semester);
    if (params?.campName) queryParams.set('campName', params.campName);
    if (params?.withReviews) queryParams.set('withReviews', 'true');
    if (params?.withActivities) queryParams.set('withActivities', 'true');
    if (params?.reviewRole) queryParams.set('reviewRole', params.reviewRole);
    if (params?.activityName) queryParams.set('activityName', params.activityName);

    const queryString = queryParams.toString();
    const url = queryString
        ? `${endpoints.oc.camps(ocId)}?${queryString}`
        : endpoints.oc.camps(ocId);

    const res = await api.get<OcCampsResponse>(url);
    return {
        camps: res.camps || [],
        grandTotalMarksScored: res.grandTotalMarksScored || 0,
    };
}

/**
 * Create or upsert an OC camp with reviews and activity scores
 */
export async function createOcCamp(
    ocId: string,
    body: UpsertOcCampInput
): Promise<OcCampsResponse> {
    const response = await api.post<OcCampsResponse>(
        endpoints.oc.camps(ocId),
        body,
        { baseURL }
    );

    return {
        camps: response.camps || [],
        grandTotalMarksScored: response.grandTotalMarksScored || 0,
    };
}

/**
 * Update an existing OC camp with reviews and activity scores
 */
export async function updateOcCamp(
    ocId: string,
    body: UpdateOcCampInput
): Promise<OcCampsResponse> {
    const response = await api.put<OcCampsResponse>(
        endpoints.oc.camps(ocId),
        body
    );

    return {
        camps: response.camps || [],
        grandTotalMarksScored: response.grandTotalMarksScored || 0,
    };
}

/**
 * Delete OC camp, review, or activity score
 */
export async function deleteOcCampData(
    ocId: string,
    params: {
        ocCampId?: string;
        reviewId?: string;
        activityScoreId?: string;
    }
): Promise<OcCampsResponse> {
    const response = await api.delete<OcCampsResponse>(
        endpoints.oc.camps(ocId),
        params as any
    );

    return {
        camps: response.camps || [],
        grandTotalMarksScored: response.grandTotalMarksScored || 0,
    };
}
