// /hooks/useHikeActions.ts
"use client";

import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import {
    createOcHikeRecord,
    listOcHikeRecords,
    updateOcHikeRecord,
    deleteOcHikeRecord,
} from "@/app/lib/api/hikeApi";
import { HikeFormValues } from "@/types/hike";

export const useHikeActions = (selectedCadet: any) => {
    const { getValues, setValue } = useFormContext<HikeFormValues>();

    const submitHike = async () => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        const rows = getValues().hikeRows;

        try {
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const { id, semester, reason, type, dateFrom, dateTo, remark } = row;

                if (!reason.trim() && id) {
                    await deleteOcHikeRecord(selectedCadet.ocId, id);
                    setValue(`hikeRows.${i}.id`, null);
                    continue;
                }

                if (!reason.trim() && !id) continue;

                const payload = {
                    semester,
                    reason,
                    type,
                    dateFrom,
                    dateTo,
                    remark,
                };

                if (id) {
                    await updateOcHikeRecord(selectedCadet.ocId, id, payload);
                } else {
                    const created: any = await createOcHikeRecord(selectedCadet.ocId, payload);
                    setValue(`hikeRows.${i}.id`, created?.id);
                }
            }

            toast.success("Hike records saved!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save hike records");
        }
    };

    const fetchHike = async () => {
        if (!selectedCadet?.ocId) return [];
        const res = await listOcHikeRecords(selectedCadet.ocId);
        return (res.items ?? []).filter((x) => x.type === "HIKE");
    };

    const deleteFormHike = async (index: number, remove: (i: number) => void) => {
        const rows = getValues().hikeRows;
        const row = rows[index];
        if (!row) return;

        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        if (!row.id) {
            remove(index);
            toast.success("Row removed");
            return;
        }

        try {
            await deleteOcHikeRecord(selectedCadet.ocId, row.id);
            remove(index);
            toast.success("Hike record deleted");
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete hike record");
        }
    };

    const deleteSavedHike = async (recordId: string) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return false;
        }

        try {
            await deleteOcHikeRecord(selectedCadet.ocId, recordId);
            toast.success("Hike record deleted");
            return true;
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete hike record");
            return false;
        }
    };

    return { submitHike, fetchHike, deleteFormHike, deleteSavedHike };
};
