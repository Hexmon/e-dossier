"use client";

import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import {
    createOcLeaveRecord,
    deleteOcLeaveRecord,
    listOcLeaveRecords,
    updateOcLeaveRecord,
} from "@/app/lib/api/leaveApi";
import { LeaveFormValues } from "@/types/lve";

type LeaveDateFields = {
    reason?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    remark?: string | null;
};

const hasValue = (value: string | null | undefined) => Boolean(value?.trim());

function hasEnteredLeaveData(row: LeaveDateFields) {
    return hasValue(row.reason) || hasValue(row.dateFrom) || hasValue(row.dateTo) || hasValue(row.remark);
}

export function isLeaveMissingDates(row: LeaveDateFields) {
    if (!hasEnteredLeaveData(row)) return false;
    return !hasValue(row.dateFrom) || !hasValue(row.dateTo);
}

export const useLeaveActions = (selectedCadet: any) => {
    const { getValues, setValue } = useFormContext<LeaveFormValues>();

    const submitLeave = async () => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return false;
        }

        const rows = getValues().leaveRows;
        if (rows.some(isLeaveMissingDates)) {
            toast.error("Please mention dates");
            return false;
        }

        try {
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const { id, reason, dateFrom, dateTo, remark, type, semester } = row;

                if (!reason.trim() && id) {
                    await deleteOcLeaveRecord(selectedCadet.ocId, id);
                    setValue(`leaveRows.${i}.id`, null);
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
                    await updateOcLeaveRecord(selectedCadet.ocId, id, payload);
                } else {
                    const created: any = await createOcLeaveRecord(selectedCadet.ocId, payload);
                    setValue(`leaveRows.${i}.id`, created?.id);
                }
            }

            toast.success("Leave records saved!");
            return true;
        } catch (e) {
            console.error(e);
            toast.error("Failed to save leave records");
            return false;
        }
    };

    const fetchLeave = async () => {
        if (!selectedCadet?.ocId) return [];
        const res = await listOcLeaveRecords(selectedCadet.ocId);
        return (res.items ?? []).filter((x) => x.type === "LEAVE");
    };

    const deleteLeave = async (index: number, remove: (i: number) => void) => {
        const rows = getValues().leaveRows;
        const row = rows[index];

        if (!row) return;

        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        if (!row.id) {
            remove(index);
            return toast.success("Row deleted");
        }

        try {
            await deleteOcLeaveRecord(selectedCadet.ocId, row.id);
            remove(index);
            toast.success("Leave record deleted");
        } catch (e) {
            console.error(e);
            toast.error("Delete failed");
        }
    };

    const deleteSavedLeave = async (recordId: string) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return false;
        }

        try {
            await deleteOcLeaveRecord(selectedCadet.ocId, recordId);
            toast.success("Leave record deleted");
            return true;
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete record");
            return false;
        }
    };

    return { submitLeave, fetchLeave, deleteLeave, deleteSavedLeave };
};
