import { api } from "@/app/lib/apiClient";
import { endpoints } from "@/constants/endpoints";

export interface Punishment {
    id?: string;
    title: string;
    marksDeduction: number;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

export interface PunishmentCreate {
    title: string;
    marksDeduction: number;
}

export interface PunishmentUpdate {
    title?: string;
    marksDeduction?: number;
}

export interface ListPunishmentsParams {
    q?: string;
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
    [key: string]: string | number | boolean | undefined;
}

export async function listPunishments(
    params?: ListPunishmentsParams
): Promise<{ punishments: Punishment[] }> {
    const response = await api.get<{ items: Punishment[]; count: number }>(
        endpoints.admin.punishments,
        {
            query: params as Record<string, string | number | boolean | undefined>,
        }
    );
    return { punishments: response.items || [] };
}

export async function getPunishmentById(punishmentId: string): Promise<Punishment> {
    const res = await api.get<{ punishment: Punishment }>(
        endpoints.admin.punishmentById(punishmentId)
    );
    return res.punishment;
}

export async function createPunishment(
    payload: PunishmentCreate
): Promise<Punishment> {
    const res = await api.post<{ punishment: Punishment }, PunishmentCreate>(
        endpoints.admin.punishments,
        payload
    );
    return res.punishment;
}

export async function updatePunishment(
    punishmentId: string,
    payload: PunishmentUpdate
): Promise<Punishment> {
    const res = await api.patch<{ punishment: Punishment }, PunishmentUpdate>(
        endpoints.admin.punishmentById(punishmentId),
        payload
    );
    return res.punishment;
}

export async function deletePunishment(
    punishmentId: string,
    hard: boolean = true
): Promise<{ id: string; message: string }> {
    return await api.delete(endpoints.admin.punishmentById(punishmentId), {
        query: { hard },
    });
}