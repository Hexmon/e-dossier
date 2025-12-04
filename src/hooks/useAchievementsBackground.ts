"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
    getAchievements,
    saveAchievements,
    updateAchievementRecord,
    deleteAchievementRecord,
    AchievementRecords
} from "@/app/lib/api/achievementsApi";
import { Achievement } from "@/types/background-detls";

export function useAchievements(ocId: string) {
    const [items, setItems] = useState<Achievement[]>([]);

    // --------------------------
    // FETCH & NORMALIZE
    // --------------------------
    const fetch = useCallback(async () => {
        if (!ocId) return;

        try {
            const data = await getAchievements(ocId);

            const normalized: Achievement[] = data.map((item) => ({
                id: item.id,
                event: item.event ?? "",
                year: item.year ?? 0,
                level: item.level ?? "",
                prize: item.prize ?? "",
            }));

            setItems(normalized);
        } catch {
            toast.error("Failed to load achievements");
        }
    }, [ocId]);

    // --------------------------
    // SAVE (UI → API conversion)
    // --------------------------
    const save = async (payload: Omit<Achievement, "id">[]) => {
        try {
            // Convert UI → API
            const converted: AchievementRecords[] = payload.map((item) => ({
                event: item.event,
                year: Number(item.year),
                level: item.level,
                prize: item.prize,
            }));

            const res = await saveAchievements(ocId, converted);

            if (!Array.isArray(res) || res.length === 0) {
                toast.error("Failed to save achievements");
                return null;
            }

            toast.success("Achievements saved");
            return res;
        } catch {
            toast.error("Unexpected error saving");
            return null;
        }
    };

    // --------------------------
    // UPDATE RECORD
    // --------------------------
    const update = async (id: string, payload: Partial<Achievement>) => {
        try {
            const converted: Partial<AchievementRecords> = {
                event: payload.event,
                level: payload.level,
                prize: payload.prize,
                year: payload.year !== undefined ? Number(payload.year) : undefined,
            };

            await updateAchievementRecord(ocId, id, converted);

            toast.success("Achievement updated");
            return true;
        } catch {
            toast.error("Failed to update achievement");
            return false;
        }
    };

    // --------------------------
    // DELETE RECORD
    // --------------------------
    const remove = async (id: string) => {
        try {
            await deleteAchievementRecord(ocId, id);
            toast.success("Achievement deleted");
            return true;
        } catch {
            toast.error("Failed to delete achievement");
            return false;
        }
    };

    return { items, fetch, save, update, remove };
}
