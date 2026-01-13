// src/services/campApi.ts
import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

// Types
export type ReviewRole = "OIC" | "PLATOON_COMMANDER" | "HOAT";

export interface TrainingCampActivity {
    id: string;
    name: string;
    defaultMaxMarks: number;
    trainingCampId: string;
    createdAt: string;
    updatedAt: string;
}

export interface TrainingCamp {
    id: string;
    name: string;
    semester: string;
    year?: number;
    activities?: TrainingCampActivity[];
    createdAt: string;
    updatedAt: string;
}

export interface CampReview {
    id?: string;
    role: ReviewRole;
    sectionTitle: string;
    reviewText: string;
}

export interface CampActivity {
    id?: string;
    trainingCampActivityId: string;
    marksScored: number | null;
    remark?: string | null;
}

export interface OcCamp {
    id: string;
    ocId: string;
    ocCampId?: string;
    trainingCampId: string;
    campName?: string;
    semester?: string;
    year: number;
    totalMarksScored: number;
    maxTotalMarks?: number;
    reviews: CampReview[];
    activities: Array<{
        id: string;
        trainingCampActivityId: string;
        name: string;
        marksScored: number;
        defaultMaxMarks: number;
        maxMarks?: number; 
        remark?: string | null;
    }>;
    createdAt: string;
    updatedAt: string;
}

// Shared type for component props to avoid duplication
export type OcCampData = OcCamp | null;

export interface CreateOcCampPayload {
    trainingCampId: string;
    year: number;
    reviews?: Array<{
        role: ReviewRole;
        sectionTitle: string;
        reviewText: string;
    }>;
    activities?: Array<{
        trainingCampActivityId: string;
        marksScored: number | null;
        remark?: string | null;
    }>;
}

export interface UpdateOcCampPayload extends CreateOcCampPayload {
    ocCampId: string;
}

// API Functions

/**
 * Get all training camps with optional filters
 */
export const getAllTrainingCamps = async (params?: {
    includeActivities?: boolean;
    includeReviews?: boolean;
    includeDeleted?: boolean;
}): Promise<{ items: TrainingCamp[]; count: number }> => {
    const { includeActivities = true, includeReviews = true, includeDeleted = false } = params || {};

    return api.get<{ items: TrainingCamp[]; count: number }>(
        endpoints.admin.trainingCamps.list,
        {
            query: {
                includeActivities,
                includeReviews,
                includeDeleted,
            },
        }
    );
};

/**
 * Get a specific training camp by ID
 */
export const getTrainingCampById = async (
    campId: string,
    includeActivities = true
): Promise<{ camp: TrainingCamp }> => {
    return api.get<{ camp: TrainingCamp }>(
        endpoints.admin.trainingCamps.getById(campId),
        {
            query: { includeActivities },
        }
    );
};

/**
 * Get all camps for a specific OC
 */
export const getOcCamps = async (
    ocId: string,
    params?: {
        withReviews?: boolean;
        withActivities?: boolean;
        campName?: string;
    }
): Promise<{ camps: OcCamp[] }> => {
    const { withReviews = true, withActivities = true, campName } = params || {};

    return api.get<{ camps: OcCamp[] }>(
        endpoints.oc.camps.list(ocId),
        {
            query: {
                withReviews,
                withActivities,
                ...(campName && { campName }),
            },
        }
    );
};

/**
 * Get a specific camp for an OC by camp name
 */
export const getOcCampByName = async (
    ocId: string,
    campName: string,
    params?: {
        withReviews?: boolean;
        withActivities?: boolean;
    }
): Promise<{ camps: OcCamp[] }> => {
    const { withReviews = true, withActivities = true } = params || {};

    return api.get<{ camps: OcCamp[] }>(
        endpoints.oc.camps.list(ocId),
        {
            query: {
                campName,
                withReviews,
                withActivities,
            },
        }
    );
};

/**
 * Create a new OC camp with activities and reviews
 */
export const createOcCamp = async (
    ocId: string,
    payload: CreateOcCampPayload
): Promise<{ camp: OcCamp }> => {
    return api.post<{ camp: OcCamp }, CreateOcCampPayload>(
        endpoints.oc.camps.create(ocId),
        payload
    );
};

/**
 * Update an existing OC camp
 */
export const updateOcCamp = async (
    ocId: string,
    payload: UpdateOcCampPayload
): Promise<{ camp: OcCamp }> => {
    return api.put<{ camp: OcCamp }, UpdateOcCampPayload>(
        endpoints.oc.camps.update(ocId),
        payload
    );
};

/**
 * Delete an OC camp
 */
export const deleteOcCamp = async (
    ocId: string,
    ocCampId: string
): Promise<{ success: boolean }> => {
    return api.delete<{ success: boolean }>(
        endpoints.oc.camps.delete(ocId, ocCampId)
    );
};