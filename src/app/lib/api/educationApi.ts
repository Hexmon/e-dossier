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
