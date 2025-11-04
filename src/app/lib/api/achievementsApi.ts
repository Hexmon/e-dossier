import { year } from "drizzle-orm/mysql-core";
import { api } from "../apiClient";
import { endpoints } from "@/constants/endpoints";

export interface AchievementRecords {
    event: string;
    year: number;
    level: string;
    prize: string;
}
export interface ApiResponse<T = any> {
    status: number;
    ok?: boolean;
    data?: T;
}

export async function saveAchievements(ocId: string, achievements: AchievementRecords[]): Promise<ApiResponse[]> {
    const responses: ApiResponse[] = [];

    try {
        for (const record of achievements) {
            const payload = {
                event: record.event,
                year: record.year,
                level: record.level,
                prize: record.prize,
            };

            const response = (await api.post(
                endpoints.oc.achievements(ocId),
                payload
            )) as ApiResponse;

            responses.push(response);
        }

        return responses;
    } catch (error: any) {
        console.error("Error saving achievements:", error);
        return [];
    }
}