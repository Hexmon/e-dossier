import z from "zod";
import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";
import {
    sportsAndGamesCreateSchema,
    sportsAndGamesUpdateSchema,
} from "@/app/lib/oc-validators";

export type SportsAndGamesCreate = z.infer<typeof sportsAndGamesCreateSchema>;
export type SportsAndGamesUpdate = z.infer<typeof sportsAndGamesUpdateSchema>;

export type SportsAndGamesRecord = SportsAndGamesCreate & {
    id: string;
    ocId: string;
};

export type ListParams = {
    limit?: number;
    offset?: number;
};

export async function listSportsAndGames(
    ocId: string,
    params?: ListParams,
): Promise<{ items: SportsAndGamesRecord[]; count: number }> {
    return await api.get(endpoints.oc.sportsAndGames(ocId), {
        query: params,
    });
}

export async function getSportsAndGames(
    ocId: string,
    id: string,
): Promise<SportsAndGamesRecord> {
    const res = await api.get<{ data: SportsAndGamesRecord }>(
        endpoints.oc.sportsAndGamesById(ocId, id),
    );
    return res.data;
}

export async function createSportsAndGames(
    ocId: string,
    payload: SportsAndGamesCreate,
): Promise<SportsAndGamesRecord> {
    const res = await api.post<{ data: SportsAndGamesRecord }, SportsAndGamesCreate>(
        endpoints.oc.sportsAndGames(ocId),
        payload,
    );
    return res.data;
}

export async function updateSportsAndGames(
    ocId: string,
    id: string,
    payload: SportsAndGamesUpdate,
): Promise<SportsAndGamesRecord> {
    const res = await api.patch<{ data: SportsAndGamesRecord }, SportsAndGamesUpdate>(
        endpoints.oc.sportsAndGamesById(ocId, id),
        payload,
    );
    return res.data;
}

export async function deleteSportsAndGames(
    ocId: string,
    id: string,
    hard?: boolean,
): Promise<{ id: string; message: string }> {
    const query = hard ? { hard: "true" } : undefined;
    return await api.delete(endpoints.oc.sportsAndGamesById(ocId, id), {
        query,
    });
}

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

