"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
    listSportsAndGames,
    saveSportsGame,
    updateSportsAndGames,
} from "@/app/lib/api/sportsAndGamesApi";
import {
    createMotivationAward,
    updateMotivationAward,
} from "@/app/lib/api/motivationAwardApi";
import type { Row, SemesterData } from "@/types/sportsAwards";
import { getMotivationAwards } from "@/app/lib/api/motivationAwardsApi";

/**
 * Hook that wraps listing/upserting sports & motivation awards.
 * Uses the same API shapes your existing code expects.
 */
export function useSportsAwards(ocId?: string | null, semestersCount = 6) {
    const [savedData, setSavedData] = useState<SemesterData[]>(
        () =>
            Array.from({ length: semestersCount }, () => ({
                spring: [],
                autumn: [],
                motivation: [],
            }))
    );
    const [loading, setLoading] = useState(false);
    const loadingRef = useRef(false);

    const loadAll = useCallback(async () => {
        if (!ocId) return savedData;
        if (loadingRef.current) return savedData;
        loadingRef.current = true;
        setLoading(true);
        try {
            const [sportsRes, motRes] = await Promise.all([
                listSportsAndGames(ocId),
                getMotivationAwards(ocId),
            ]);

            const sportsItems = sportsRes?.items ?? [];
            const motivationItems = motRes ?? [];

            const grouped = Array.from({ length: semestersCount }, () => ({
                spring: [] as Row[],
                autumn: [] as Row[],
                motivation: [] as Row[],
            }));

            for (const item of sportsItems) {
                const {
                    id,
                    ocId: itemOcId,
                    semester,
                    term,
                    sport,
                    maxMarks,
                    marksObtained,
                    sportsStrings,
                } = item;

                const idx = Math.max(0, (Number(semester) || 1) - 1);
                const target = term === "autumn" ? grouped[idx].autumn : grouped[idx].spring;

                if (!target.some((s) => s.id === id)) {
                    target.push({
                        id,
                        ocId: itemOcId ?? ocId,
                        term,
                        activity: sport ?? "-",
                        string: sportsStrings ?? "",
                        maxMarks: maxMarks ?? "",
                        obtained:
                            marksObtained !== undefined ? String(marksObtained) : "",
                    });
                }
            }

            for (const item of motivationItems) {
                const {
                    id,
                    ocId: itemOcId,
                    semester,
                    fieldName,
                    motivationTitle,
                    maxMarks,
                    marksObtained,
                } = item;

                const idx = Math.max(0, (Number(semester) || 1) - 1);

                if (!grouped[idx].motivation.some((m) => m.id === id)) {
                    grouped[idx].motivation.push({
                        id,
                        ocId: itemOcId ?? ocId,
                        term: "motivation",
                        activity: fieldName ?? "-",
                        string: motivationTitle ?? "-",
                        maxMarks: maxMarks ?? "",
                        obtained:
                            marksObtained !== undefined ? String(marksObtained) : "",
                    });
                }
            }

            setSavedData(grouped);
            return grouped;
        } catch (err) {
            console.error(err);
            toast.error("Failed to load sports & motivation data");
            return savedData;
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, [ocId, semestersCount]);

    const upsertSportsRows = useCallback(
        async (semesterNumber: number, term: "spring" | "autumn", rows: Row[]) => {
            if (!ocId) return false;
            try {
                for (const r of rows) {
                    const { id, activity, string, maxMarks, obtained } = r;
                    const payload = {
                        sport: activity,
                        sportsStrings: string || "",
                        maxMarks: Number(maxMarks ?? 0),
                        marksObtained: Number(obtained ?? 0),
                    };
                    if (id) {
                        await updateSportsAndGames(ocId, String(id), payload);
                    } else if (String(activity ?? "").trim() !== "") {
                        await saveSportsGame(ocId, {
                            semester: semesterNumber,
                            term,
                            ...payload,
                        });
                    }
                }
                await loadAll();
                toast.success("Saved sports/games");
                return true;
            } catch (err) {
                console.error(err);
                toast.error("Failed to save sports/games");
                return false;
            }
        },
        [ocId, loadAll]
    );

    const upsertMotivationRows = useCallback(
        async (semesterNumber: number, rows: Row[]) => {
            if (!ocId) return false;
            try {
                for (const r of rows) {
                    const { id, activity, string, maxMarks, obtained } = r;
                    const payload = {
                        fieldName: activity,
                        motivationTitle: string || "-",
                        maxMarks: Number(maxMarks ?? 0),
                        marksObtained: Number(obtained ?? 0),
                    };
                    if (id) {
                        await updateMotivationAward(ocId, String(id), payload);
                    } else if (String(activity ?? "").trim() !== "") {
                        await createMotivationAward(ocId, {
                            semester: semesterNumber,
                            ...payload,
                        });
                    }
                }
                await loadAll();
                toast.success("Saved motivation awards");
                return true;
            } catch (err) {
                console.error(err);
                toast.error("Failed to save motivation awards");
                return false;
            }
        },
        [ocId, loadAll]
    );

    const removeRowLocal = useCallback((semesterIdx: number, term: keyof SemesterData, id: string) => {
        setSavedData((prev) => {
            const copy = prev.map((s) => ({
                spring: [...s.spring],
                autumn: [...s.autumn],
                motivation: [...s.motivation],
            }));
            copy[semesterIdx] = {
                ...copy[semesterIdx],
                [term]: copy[semesterIdx][term].filter((r) => r.id !== id),
            } as SemesterData;
            return copy;
        });
    }, []);

    return {
        savedData,
        setSavedData,
        loading,
        loadAll,
        upsertSportsRows,
        upsertMotivationRows,
        removeRowLocal,
    };
}
