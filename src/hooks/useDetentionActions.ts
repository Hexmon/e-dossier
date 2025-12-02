"use client";

import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import {
    createOcDetentionRecord,
    listOcDetentionRecords,
    updateOcDetentionRecord,
    deleteOcDetentionRecord,
} from "@/app/lib/api/detentionApi";
import { DetentionFormValues } from "@/types/detention";

export const useDetentionActions = (selectedCadet: any) => {
    const { getValues, setValue } = useFormContext<DetentionFormValues>();

    const submitDetention = async () => {
        if (!selectedCadet?.ocId) return toast.error("No cadet selected");

        const rows = getValues().detentionRows;

        try {
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const { id, semester, reason, dateFrom, dateTo, remark } = row;

                if (!reason.trim() && id) {
                    await deleteOcDetentionRecord(selectedCadet.ocId, id);
                    setValue(`detentionRows.${i}.id`, null);
                    continue;
                }

                if (!reason.trim()) continue;

                const payload = {
                    semester,
                    reason,
                    type: "DETENTION",
                    dateFrom,
                    dateTo,
                    remark,
                };

                if (id) {
                    await updateOcDetentionRecord(selectedCadet.ocId, id, payload);
                } else {
                    const created: any = await createOcDetentionRecord(selectedCadet.ocId, payload);
                    setValue(`detentionRows.${i}.id`, created?.id);
                }
            }

            toast.success("Detention records saved!");
        } catch {
            toast.error("Failed to save detention records");
        }
    };

    const fetchDetention = async () => {
        if (!selectedCadet?.ocId) return [];
        const res = await listOcDetentionRecords(selectedCadet.ocId);

        return (res.items ?? []).filter((x) => x.type === "DETENTION");
    };

    const deleteSavedDetention = async (recordId: string) => {
        if (!selectedCadet?.ocId) return false;

        try {
            await deleteOcDetentionRecord(selectedCadet.ocId, recordId);
            toast.success("Detention record deleted");
            return true;
        } catch {
            toast.error("Failed to delete detention record");
            return false;
        }
    };

    return { submitDetention, fetchDetention, deleteSavedDetention };
};
