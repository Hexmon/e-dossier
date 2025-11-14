// src/app/lib/api/educationApi.ts
import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";


// Type definition for the education record
export interface EducationRecord {
    level: string;
    school: string;
    board: string;
    subjects: string;
    percentage: number;
}

export interface EducationUpdate extends EducationRecord {
    id: string;
}

export interface EducationUI {
    id: string;
    qualification: string;
    school: string;
    subs: string;
    board: string;
    marks: string;
    grade: string;
}

export interface EducationRecordResponse {
    id: string;
    ocId: string;
    level: string;
    schoolOrCollege: string | null;
    boardOrUniv: string | null;
    subjects: string | null;
    totalPercent: number | null;
}


export interface ApiResponse<T = any> {
    status: number;
    ok?: boolean;
    data?: T;
}

/** Save or update education details for a cadet */
export async function saveEducationDetails(
    ocId: string,
    education: EducationRecord[]
): Promise<ApiResponse[]> {
    const responses: ApiResponse[] = [];

    try {
        for (const record of education) {
            const payload = {
                level: record.level,
                schoolOrCollege: record.school,
                boardOrUniv: record.board,
                subjects: record.subjects,
                totalPercent: record.percentage,
            };

            const response = (await api.post(
                endpoints.oc.education(ocId),
                payload
            )) as ApiResponse;

            responses.push(response);
        }

        return responses;
    } catch (error: any) {
        console.error("Error saving education details:", error);
        return [];
    }
}

export async function getEducationDetails(ocId: string): Promise<EducationRecordResponse[]> {
    try {
        const response = await api.get<{ items: EducationRecordResponse[]; count: number }>(
            endpoints.oc.education(ocId)
        );
        if (Array.isArray(response?.items)) {
            return response.items;
        }

        return [];
    } catch (error) {
        console.error("Error fetching education details:", error);
        return [];
    }
}

// UPDATE Education Entry
export async function updateEducationRecord(
    ocId: string,
    eduId: string,
    payload: Partial<{ percentage: number }>
) {
    return api.patch(`${endpoints.oc.education(ocId)}/${eduId}`, payload);
}

// DELETE Education Entry
export async function deleteEducationRecord(ocId: string, eduId: string) {
    return api.delete(`${endpoints.oc.education(ocId)}/${eduId}`);
}