// hooks/useMedicalCategory.ts
"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
    getMedicalCategory,
    saveMedicalCategory,
    updateMedicalCategory,
    deleteMedicalCategory,
} from "@/app/lib/api/medCatApi";

import type { MedCatBackendPayload, MedCatRow, MedicalCategoryFormData } from "@/types/med-records";

/**
 * Hook to manage MED CAT records for a given ocId
 */
export function useMedicalCategory(ocId: string) {
    const [items, setItems] = useState<MedCatRow[]>([]);
    const [loading, setLoading] = useState(false);

    /** ---------------- FETCH EXISTING RECORDS ---------------- **/
    const fetch = useCallback(async () => {
        if (!ocId) return;

        try {
            setLoading(true);
            const data = await getMedicalCategory(ocId);

            const normalized: MedCatRow[] = (Array.isArray(data) ? data : []).map((item) => ({
                id: item.id,
                semester: item.semester,
                term: item.semester ? `TERM ${item.semester}` : "TERM -",
                date: item.date ? item.date.split("T")[0] : "",
                diagnosis: item.mosAndDiagnostics ?? "",
                catFrom: item.catFrom ? item.catFrom.split("T")[0] : "",
                catTo: item.catTo ? item.catTo.split("T")[0] : "",
                mhFrom: item.mhFrom ? item.mhFrom.split("T")[0] : "",
                mhTo: item.mhTo ? item.mhTo.split("T")[0] : "",
                absence: item.absence ?? "",
                piCdrInitial: item.platoonCommanderName ?? "",
            }));

            setItems(normalized);
        } catch {
            toast.error("Failed to load MED CAT records");
        } finally {
            setLoading(false);
        }
    }, [ocId]);

    /** ---------------- SAVE NEW RECORDS ---------------- **/
    const save = useCallback(
        async (payload: MedCatBackendPayload[]) => {
            if (!ocId) return null;

            try {

                const response = await saveMedicalCategory(ocId, payload);

                if (!Array.isArray(response)) {
                    toast.error("Failed to save MED CAT");
                    return null;
                }

                toast.success("MED CAT saved");
                await fetch();
                return response;
            } catch {
                toast.error("Failed to save MED CAT");
                return null;
            }
        },
        [ocId, fetch]
    );

    /** ---------------- UPDATE RECORD ---------------- **/
    const update = useCallback(
        async (id: string, payload: Partial<MedCatRow>) => {
            if (!ocId) return null;

            try {
                const body = {
                    date: payload.date || "",
                    mosAndDiagnostics: payload.mosAndDiagnostics || payload.diagnosis || "",
                    catFrom: payload.catFrom || "",
                    catTo: payload.catTo || "",
                    mhFrom: payload.mhFrom || "",
                    mhTo: payload.mhTo || "",
                    absence: payload.absence || "",
                    platoonCommanderName: payload.platoonCommanderName || payload.piCdrInitial || "",
                };

                await updateMedicalCategory(ocId, id, body);
                toast.success("MED CAT updated");
                await fetch();
                return true;
            } catch {
                toast.error("Failed to update MED CAT");
                return false;
            }
        },
        [ocId, fetch]
    );

    /** ---------------- DELETE RECORD ---------------- **/
    const remove = useCallback(
        async (id: string) => {
            if (!ocId) return false;

            try {
                await deleteMedicalCategory(ocId, id);
                toast.success("MED CAT deleted");
                await fetch();
                return true;
            } catch {
                toast.error("Failed to delete MED CAT");
                return false;
            }
        },
        [ocId, fetch]
    );

    return {
        items,
        setItems,
        loading,
        fetch,
        save,
        update,
        remove,
    };
}
