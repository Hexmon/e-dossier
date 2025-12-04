"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
    createSpeedMarch,
    listSpeedMarch,
    updateSpeedMarch,
    deleteSpeedMarch,
    SpeedMarchRecord,
} from "@/app/lib/api/speedMarchApi";

/**
 * Payload types
 */
export type SaveSpeedPayload = {
    id?: string;
    semester: number;
    test: string;
    timings?: string;
    marks?: number;
    remark?: string;
};

export type UseSpeedMarchReturn = {
    loading: boolean;
    records: SpeedMarchRecord[];
    loadAll: () => Promise<void>;
    saveRecords: (records: SaveSpeedPayload[]) => Promise<boolean>;
    updateRecord: (id: string, payload: Partial<SaveSpeedPayload>) => Promise<boolean>;
    deleteRecord: (id: string) => Promise<boolean>;
};

export function useSpeedMarch(ocId?: string | null): UseSpeedMarchReturn {
    const [records, setRecords] = useState<SpeedMarchRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const loadingRef = useRef(false);

    const loadAll = useCallback(async () => {
        if (!ocId || loadingRef.current) return;
        loadingRef.current = true;
        setLoading(true);
        try {
            const res = await listSpeedMarch(ocId);
            const items: SpeedMarchRecord[] = res?.items ?? [];
            setRecords(items);
        } catch (err) {
            console.error("useSpeedMarch.loadAll", err);
            toast.error("Failed to load speed march records");
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, [ocId]);

    const saveRecords = useCallback(
        async (items: SaveSpeedPayload[]) => {
            if (!ocId) return false;
            try {
                for (const it of items) {
                    const { id, semester, test, timings = "", marks = 0, remark } = it;
                    if (id) {
                        await updateSpeedMarch(ocId, id, {
                            semester,
                            test,
                            timings,
                            marks,
                            remark,
                        });
                    } else {
                        if (String(test ?? "").trim() === "" && String(timings ?? "").trim() === "") {
                            // skip empty row
                            continue;
                        }
                        await createSpeedMarch(ocId, {
                            semester,
                            test,
                            timings,
                            marks,
                            remark,
                        });
                    }
                }

                await loadAll();
                toast.success("Speed march saved");
                return true;
            } catch (err) {
                console.error("useSpeedMarch.saveRecords", err);
                toast.error("Failed to save speed march");
                return false;
            }
        },
        [ocId, loadAll]
    );

    const updateRecord = useCallback(
        async (id: string, payload: Partial<SaveSpeedPayload>) => {
            if (!ocId) return false;
            try {
                await updateSpeedMarch(ocId, id, {
                    semester: payload.semester ?? 0,
                    test: payload.test ?? "",
                    timings: payload.timings ?? "",
                    marks: payload.marks ?? 0,
                    remark: payload.remark ?? undefined,
                });
                await loadAll();
                toast.success("Record updated");
                return true;
            } catch (err) {
                console.error("useSpeedMarch.updateRecord", err);
                toast.error("Failed to update speed march record");
                return false;
            }
        },
        [ocId, loadAll]
    );

    const deleteRecord = useCallback(
        async (id: string) => {
            if (!ocId) return false;
            try {
                await deleteSpeedMarch(ocId, id);
                setRecords((prev) => prev.filter((r) => r.id !== id));
                toast.success("Record deleted");
                return true;
            } catch (err) {
                console.error("useSpeedMarch.deleteRecord", err);
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
