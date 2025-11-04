import { year } from "drizzle-orm/mysql-core";
import { api } from "../apiClient";
import { endpoints } from "@/constants/endpoints";

export interface AchievementRecords {
    event: string;
    year: number;
    level: string;
    prize: string;
}

export async function saveAchievements(ocId:string, achievements: AchievementRecords[]) {
    for(const record of achievements){
        const payload = {
            event: record.event,
            year: record.year,
            level: record.level,
            prize: record.prize,
        };

        await api.post(endpoints.oc.achievements(ocId), payload);
    }
}