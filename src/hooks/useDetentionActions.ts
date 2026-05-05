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

type DetentionDateFields = {
    reason?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    remark?: string | null;
};

const hasValue = (value: string | null | undefined) => Boolean(value?.trim());

function hasEnteredDetentionData(row: DetentionDateFields) {
    return hasValue(row.reason) || hasValue(row.dateFrom) || hasValue(row.dateTo) || hasValue(row.remark);
}

export function isDetentionMissingDates(row: DetentionDateFields) {
    if (!hasEnteredDetentionData(row)) return false;
    return !hasValue(row.dateFrom) || !hasValue(row.dateTo);
}

export const useDetentionActions = (selectedCadet: any) => {
    const { getValues, setValue } = useFormContext<DetentionFormValues>();

    const submitDetention = async () => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return false;
        }

        const rows = getValues().detentionRows;
        if (rows.some(isDetentionMissingDates)) {
            toast.error("Please mention dates");
            return false;
        }

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
            return true;
        } catch {
            toast.error("Failed to save detention records");
            return false;
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
