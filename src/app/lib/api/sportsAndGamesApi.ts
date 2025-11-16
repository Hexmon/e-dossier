import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

export interface SportsGamePayload {
    semester: number;
    term: "spring" | "autumn";
    sport: string;
    maxMarks: number;
    marksObtained: number;
}

export async function saveSportsGame(
    ocId: string,
    payload: SportsGamePayload
) {
    console.log("spring, autmn", payload)
    return api.post(endpoints.oc.sportsAndGames(ocId), payload);
}
