// hooks/useObstacleTraining.ts
"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
    createObstacleTraining,
    listObstacleTraining,
    updateObstacleTraining,
    deleteObstacleTraining,
    ObstacleTrainingRecord,
} from "@/app/lib/api/obstacleTrainingApi";

/**
 * Hook for obstacle training CRUD and local snapshot.
 * Mirrors the style & behavior of your useWeaponTraining hook.
 */

export type SaveObstaclePayload = {
    id?: string;
    semester: number;
    obstacle: string;
    marksObtained: number;
    remark?: string;
};

export type UseObstacleTrainingReturn = {
    loading: boolean;
    records: ObstacleTrainingRecord[];
    loadAll: () => Promise<void>;
    saveRecords: (records: SaveObstaclePayload[]) => Promise<boolean>;
    updateRecord: (id: string, payload: Partial<SaveObstaclePayload>) => Promise<boolean>;
    deleteRecord: (id: string) => Promise<boolean>;
};

export function useObstacleTraining(ocId?: string | null): UseObstacleTrainingReturn {
    const [records, setRecords] = useState<ObstacleTrainingRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const loadingRef = useRef(false);

    const loadAll = useCallback(async () => {
        if (!ocId || loadingRef.current) return;
        loadingRef.current = true;
        setLoading(true);
        try {
            const res = await listObstacleTraining(ocId);
            const items = res?.items ?? [];
            setRecords(items);
        } catch (err) {
            console.error("useObstacleTraining.loadAll", err);
            toast.error("Failed to load obstacle training records");
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, [ocId]);

    const saveRecords = useCallback(
        async (items: SaveObstaclePayload[]) => {
            if (!ocId) return false;
            try {
                for (const it of items) {
                    const { id, semester, obstacle, marksObtained, remark } = it;
                    if (id) {
                        await updateObstacleTraining(ocId, id, {
                            marksObtained,
                            remark,
                        });
                    } else {
                        await createObstacleTraining(ocId, {
                            semester,
                            obstacle,
                            marksObtained,
                            remark,
                        });
                    }
                }
                await loadAll();
                toast.success("Obstacle training saved");
                return true;
            } catch (err) {
                console.error("useObstacleTraining.saveRecords", err);
                toast.error("Failed to save obstacle training");
                return false;
            }
        },
        [ocId, loadAll]
    );

    const updateRecord = useCallback(
        async (id: string, payload: Partial<SaveObstaclePayload>) => {
            if (!ocId) return false;
            try {
                await updateObstacleTraining(ocId, id, {
                    marksObtained: payload.marksObtained ?? 0,
                    remark: payload.remark ?? undefined,
                });
                await loadAll();
                toast.success("Record updated");
                return true;
            } catch (err) {
                console.error("useObstacleTraining.updateRecord", err);
                toast.error("Failed to update record");
                return false;
            }
        },
        [ocId, loadAll]
    );

    const deleteRecord = useCallback(
        async (id: string) => {
            if (!ocId) return false;
            try {
                await deleteObstacleTraining(ocId, id);
                setRecords((prev) => prev.filter((r) => r.id !== id));
                toast.success("Record deleted");
                return true;
            } catch (err) {
                console.error("useObstacleTraining.deleteRecord", err);
                toast.error("Failed to delete record");
                return false;
            }
        },
        [ocId]
    );

    return {
        loading,
        records,
        loadAll,
        saveRecords,
        updateRecord,
        deleteRecord,
    };
}