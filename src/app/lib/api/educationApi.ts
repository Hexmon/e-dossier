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

/** Save or update education details for a cadet */
export async function saveEducationDetails(ocId: string, education: EducationRecord[]) {
    for (const record of education) {
        const payload = {
            level: record.level,
            schoolOrCollege: record.school,
            boardOrUniv: record.board,
            subjects: record.subjects,
            totalPercent: record.percentage,
        };

        await api.post(endpoints.oc.education(ocId), payload);
    }
}