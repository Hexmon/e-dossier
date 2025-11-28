"use client";

import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import {
    createOcOlqRecord,
    listOcOlqRecords,
    updateOcOlqRecord,
    deleteOcOlqRecordsForSemester,
    OlqPayload,
} from "@/app/lib/api/olqApi";
import { OlqFormValues } from "@/types/olq";

/**
 * Hook returns CRUD actions for OLQ. Caller supplies selectedCadet.
 */
export const useOlqActions = (selectedCadet: any) => {
    const { getValues, setValue } = useFormContext<OlqFormValues>();

    const submitOlq = async (semester: number, perRemarkPayloads: OlqPayload[]) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        try {
            for (const payload of perRemarkPayloads) {
                // backend: POST for create, PATCH for update — we will call create if no server id present
                // The page will call create or update depending on server state; this helper just posts payloads using POST if no serverId found.
                // But we keep generic: if payload contains an id field or server gives indication use updateOcOlqRecord
                await createOcOlqRecord(selectedCadet.ocId, payload);
            }
            toast.success("OLQ records saved!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save OLQ records");
        }
    };

    const fetchOlq = async (semester: number) => {
        if (!selectedCadet?.ocId) return [];
        const res = await listOcOlqRecords(selectedCadet.ocId, semester);
        return res.items ?? [];
    };

    const updateOlq = async (semester: number, payload: OlqPayload & { deleteSubtitleIds?: string[] }) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return false;
        }

        try {
            await updateOcOlqRecord(selectedCadet.ocId, payload);
            toast.success("OLQ updated");
            return true;
        } catch (err) {
            console.error(err);
            toast.error("Failed to update OLQ");
            return false;
        }
    };

    const deleteOlqForSemester = async (semester: number) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return false;
        }

        try {
            await deleteOcOlqRecordsForSemester(selectedCadet.ocId, semester);
            toast.success("OLQ records deleted for semester");
            return true;
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete OLQ records");
            return false;
        }
    };

    return { submitOlq, fetchOlq, updateOlq, deleteOlqForSemester };
};
