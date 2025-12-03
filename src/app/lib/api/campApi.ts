import { api, ApiClientError } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";
import { OcCampsResponse } from "@/types/camp";

export interface ListOcCampsParams {
  semester?: string;
  campName?: string;
  withReviews?: string;
  withActivities?: string;
  reviewRole?: string;
  activityName?: string;
}

export interface UpsertOcCampData {
  trainingCampId: string;
  year: number;
  reviews?: Array<{
    role: string;
    sectionTitle: string;
    reviewText: string;
  }>;
  activities?: Array<{
    trainingCampActivityId: string;
    marksScored: number;
    remark?: string | null;
  }>;
}

export interface UpdateOcCampData {
  ocCampId?: string;
  trainingCampId: string;
  year: number;
  reviews?: Array<{
    role: string;
    sectionTitle: string;
    reviewText: string;
  }>;
  activities?: Array<{
    trainingCampActivityId: string;
    marksScored: number;
    remark?: string | null;
  }>;
}

export interface DeleteOcCampData {
  ocCampId?: string;
  reviewId?: string;
  activityScoreId?: string;
}


export async function listOcCamps(
  ocId: string,
  params: ListOcCampsParams = {}
): Promise<OcCampsResponse> {
  try {
    const query = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined)
    );

    const response = await api.get<OcCampsResponse>(
      endpoints.oc.camps(ocId),
      {
        baseURL,
        query,
      }
    );

    return response;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw new Error(error.message || "Failed to fetch OC camps");
    }
    throw new Error("Unexpected error occurred while fetching camps");
  }
}


export async function createOcCamp(
  ocId: string,
  data: UpsertOcCampData
): Promise<OcCampsResponse> {
  try {
    const { trainingCampId, year, reviews, activities } = data;
    const response = await api.post<OcCampsResponse>(
      endpoints.oc.camps(ocId),
      {
        trainingCampId,
        year,
        reviews: reviews || [],
        activities: activities || [],
      },
      { baseURL }
    );

    return response;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw new Error(error.message || "Failed to create OC camp");
    }
    throw new Error("Unexpected error occurred while creating camp");
  }
}


export async function updateOcCamp(
  ocId: string,
  data: UpdateOcCampData
): Promise<OcCampsResponse> {
  try {
    const { ocCampId, trainingCampId, year, reviews, activities } = data;
    const response = await api.patch<OcCampsResponse>(
      endpoints.oc.camps(ocId),
      {
        ocCampId,
        trainingCampId,
        year,
        reviews: reviews || [],
        activities: activities || [],
      },
      { baseURL }
    );

    return response;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw new Error(error.message || "Failed to update OC camp");
    }
    throw new Error("Unexpected error occurred while updating camp");
  }
}


export async function deleteOcCampData(
  ocId: string,
  data: DeleteOcCampData
): Promise<OcCampsResponse> {
  try {
    const { ocCampId, reviewId, activityScoreId } = data;
    const response = await api.delete<OcCampsResponse>(
      endpoints.oc.camps(ocId),
      {
        baseURL,
        query: {
          ...(ocCampId && { ocCampId }),
          ...(reviewId && { reviewId }),
          ...(activityScoreId && { activityScoreId }),
        },
      }
    );

    return response;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw new Error(error.message || "Failed to delete camp data");
    }
    throw new Error("Unexpected error occurred while deleting camp data");
  }
}