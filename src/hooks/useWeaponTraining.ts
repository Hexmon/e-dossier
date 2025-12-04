"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import {
    createWeaponTraining,
    listWeaponTraining,
    updateWeaponTraining,
    deleteWeaponTraining,
    WeaponTrainingRecord,
} from "@/app/lib/api/weaponTrainingApi";

import {
    createSpecialAchievementInFiring,
    listSpecialAchievementsInFiring,
    updateSpecialAchievementInFiring,
    deleteSpecialAchievementInFiring,
    SpecialAchievementInFiringRecord,
} from "@/app/lib/api/specialAchievementInFiringApi";

export type SaveWeaponPayload = {
    id?: string;
    subject: string;
    semester: number;
    maxMarks: number;
    marksObtained: number;
};

export type SaveAchievementPayload = {
    achievement: string;
};

export type UseWeaponTrainingReturn = {
    loading: boolean;
    weaponRecords: WeaponTrainingRecord[];
    achievements: SpecialAchievementInFiringRecord[];
    loadAll: () => Promise<void>;
    saveWeaponRecords: (records: SaveWeaponPayload[]) => Promise<boolean>;
    saveAchievements: (items: SaveAchievementPayload[]) => Promise<boolean>;
    deleteAchievement: (id: string) => Promise<boolean>;
};

export function useWeaponTraining(ocId?: string | null): UseWeaponTrainingReturn {
    const [weaponRecords, setWeaponRecords] = useState<WeaponTrainingRecord[]>([]);
    const [achievements, setAchievements] = useState<SpecialAchievementInFiringRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const loadingRef = useRef(false);

    // -------------------------- LOAD ALL --------------------------
    const loadAll = useCallback(async () => {
        if (!ocId || loadingRef.current) return;

        loadingRef.current = true;
        setLoading(true);

        try {
            const [wpnRes, achRes] = await Promise.all([
                listWeaponTraining(ocId),
                listSpecialAchievementsInFiring(ocId),
            ]);

            const weaponItems: WeaponTrainingRecord[] = wpnRes?.items ?? [];
            const achievementItems: SpecialAchievementInFiringRecord[] = achRes?.items ?? [];

            setWeaponRecords(weaponItems);
            setAchievements(achievementItems);
        } catch (err) {
            console.error("useWeaponTraining.loadAll", err);
            toast.error("Failed to load weapon training data");
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, [ocId]);

    // -------------------------- SAVE WEAPON RECORDS --------------------------
    const saveWeaponRecords = useCallback(
        async (records: SaveWeaponPayload[]): Promise<boolean> => {
            if (!ocId) return false;

            try {
                for (const record of records) {
                    const { id, subject, semester, maxMarks, marksObtained } = record;

                    if (id) {
                        await updateWeaponTraining(ocId, id, {
                            subject,
                            semester,
                            maxMarks,
                            marksObtained,
                        });
                    } else {
                        await createWeaponTraining(ocId, {
                            subject,
                            semester,
                            maxMarks,
                            marksObtained,
                        });
                    }
                }

                await loadAll();
                toast.success("Weapon training saved");
                return true;
            } catch (err) {
                console.error("useWeaponTraining.saveWeaponRecords", err);
                toast.error("Failed to save weapon training");
                return false;
            }
        },
        [ocId, loadAll]
    );

    // -------------------------- SAVE ACHIEVEMENTS --------------------------
    const saveAchievements = useCallback(
        async (items: SaveAchievementPayload[]): Promise<boolean> => {
            if (!ocId) return false;

            try {
                const currentRes = await listSpecialAchievementsInFiring(ocId);
                const existing: SpecialAchievementInFiringRecord[] = currentRes?.items ?? [];

                // UPDATE and DELETE existing
                for (let i = 0; i < existing.length; i++) {
                    const dbRecord = existing[i];
                    const formItem = items[i];

                    if (formItem) {
                        await updateSpecialAchievementInFiring(ocId, dbRecord.id, {
                            achievement: formItem.achievement,
                        });
                    } else {
                        await deleteSpecialAchievementInFiring(ocId, dbRecord.id);
                    }
                }

                // CREATE new items
                for (let i = existing.length; i < items.length; i++) {
                    const { achievement } = items[i];
                    if (achievement.trim() !== "") {
                        await createSpecialAchievementInFiring(ocId, { achievement });
                    }
                }

                await loadAll();
                toast.success("Achievements updated");
                return true;
            } catch (err) {
                console.error("useWeaponTraining.saveAchievements", err);
                toast.error("Failed to save achievements");
                return false;
            }
        },
        [ocId, loadAll]
    );

    // -------------------------- DELETE ACHIEVEMENT --------------------------
    const deleteAchievement = useCallback(
        async (id: string): Promise<boolean> => {
            if (!ocId) return false;

            try {
                await deleteSpecialAchievementInFiring(ocId, id);

                setAchievements((prev) => prev.filter((a) => a.id !== id));

                toast.success("Achievement deleted");
                return true;
            } catch (err) {
                console.error("useWeaponTraining.deleteAchievement", err);
                toast.error("Failed to delete achievement");
                return false;
            }
        },
        [ocId]
    );

    return {
        loading,
        weaponRecords,
        achievements,
        loadAll,
        saveWeaponRecords,
        saveAchievements,
        deleteAchievement,
    };
}