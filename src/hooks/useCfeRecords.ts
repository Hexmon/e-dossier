"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
    listCreditForExcellence,
    createCreditForExcellence,
    updateCreditForExcellence,
    deleteCreditForExcellence,
    CfeItem,
    CfeRecord,
} from "@/app/lib/api/cfeApi";

import type { cfeRow } from "@/types/cfe";

/**
 * Hook: useCfeRecords
 * - ocId: dynamic oc id
 * - semestersCount: number of semester buckets
 *
 * groups: cfeRow[][] where index = semesterIndex (semester-1)
 */
export function useCfeRecords(ocId: string, semestersCount = 6) {
    const [groups, setGroups] = useState<cfeRow[][]>(Array.from({ length: semestersCount }, () => []));
    const [loading, setLoading] = useState(false);

    const fetchAll = useCallback(async () => {
        if (!ocId) return;
        setLoading(true);
        try {
            const resp = await listCreditForExcellence(ocId);

            const buckets: cfeRow[][] = Array.from({ length: semestersCount }, () => []);

            const items = resp?.items ?? [];

            for (const rec of items as CfeRecord[]) {
                const semester = Math.max(1, Number(rec.semester ?? 1));
                const idx = Math.min(Math.max(0, semester - 1), semestersCount - 1);

                const dataArray = Array.isArray(rec.data) ? rec.data : [];

                const rows: cfeRow[] = dataArray.map((it: CfeItem, index: number) => {
                    const { cat = "", marks = 0, remarks = "" } = it ?? {};
                    return {
                        id: rec.id ?? undefined,
                        serialNo: String(index + 1),
                        cat,
                        mks: String(marks),
                        remarks: remarks ?? rec.remark ?? "",
                    };
                });

                // append rows to bucket (there may be multiple records per semester)
                buckets[idx] = [...buckets[idx], ...rows];
            }

            setGroups(buckets);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to load CFE data");
        } finally {
            setLoading(false);
        }
    }, [ocId, semestersCount]);

    /**
     * Save new records for a semester by appending to existing payloads and sending create API.
     * dataRows: array of { cat, mks, remarks } coming from the form.
     */
    const saveSemesterPayload = useCallback(
        async (semesterIndex: number, dataRows: Array<{ cat: string; mks: string; remarks?: string }>) => {
            if (!ocId) return null;
            setLoading(true);
            try {
                const semester = semesterIndex + 1;

                // transform form rows to CfeItem
                const newItems: CfeItem[] = dataRows
                    .filter((r) => r.cat && r.mks)
                    .map((r) => ({ cat: r.cat, marks: Number(r.mks) || 0, remarks: r.remarks ?? "" }));

                if (newItems.length === 0) {
                    toast.error("Please provide at least one valid row");
                    return null;
                }

                const payload = { semester, data: newItems, remark: "" };

                // Create single record (API expects array of payloads)
                const resp = await createCreditForExcellence(ocId, [payload]);

                if (!resp) {
                    toast.error("Save failed");
                    return null;
                }

                toast.success("Saved successfully");
                await fetchAll();
                return resp;
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to save CFE data");
                return null;
            } finally {
                setLoading(false);
            }
        },
        [ocId, fetchAll]
    );

    /**
     * Replace entire semester's items with given items (used by inline edit)
     * items param: array of { cat, marks, remarks }
     */
    const replaceSemesterPayload = useCallback(
        async (semesterIndex: number, items: Array<{ cat: string; marks: number; remarks?: string }>) => {
            if (!ocId) return null;
            setLoading(true);
            try {
                const semester = semesterIndex + 1;
                const payload = { semester, data: items.map((it) => ({ cat: it.cat, marks: Number(it.marks) || 0, remarks: it.remarks ?? "" })), remark: "" };

                // We will call createCreditForExcellence with one payload to overwrite current semester (backend behavior in your app previously used create to replace).
                const resp = await createCreditForExcellence(ocId, [payload]);

                if (!resp) {
                    toast.error("Update failed");
                    return null;
                }

                toast.success("Updated successfully");
                await fetchAll();
                return resp;
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to update semester payload");
                return null;
            } finally {
                setLoading(false);
            }
        },
        [ocId, fetchAll]
    );

    const deleteRecordById = useCallback(
        async (id: string) => {
            if (!ocId) return false;
            setLoading(true);
            try {
                const resp = await deleteCreditForExcellence(ocId, id);
                if (!resp) {
                    toast.error("Delete failed");
                    return false;
                }
                toast.success("Deleted");
                await fetchAll();
                return true;
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to delete record");
                return false;
            } finally {
                setLoading(false);
            }
        },
        [ocId, fetchAll]
    );

    return {
        groups,
        loading,
        fetchAll,
        saveSemesterPayload,
        replaceSemesterPayload,
        deleteRecordById,
    };
}
