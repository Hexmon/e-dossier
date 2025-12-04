"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
    getSsbReport,
    saveSsbReport,
    updateSsbReport,
    SsbReport,
    SsbPayload
} from "@/app/lib/api/ssbReportApi";

export function useSsbReport(ocId: string) {
    const [report, setReport] = useState<SsbReport | null>(null);

    const fetch = useCallback(async () => {
        if (!ocId) return;
        try {
            const data = await getSsbReport(ocId);
            setReport(data ?? null);
        } catch {
            toast.error("Failed to load SSB Report");
        }
    }, [ocId]);

    const save = async (payload: SsbPayload) => {
        try {
            const res = await saveSsbReport(ocId, payload);
            if (!res) {
                toast.error("Failed to save SSB Report");
                return null;
            }
            toast.success("SSB Report saved");
            return res;
        } catch {
            toast.error("Error saving SSB report");
            return null;
        }
    };

    const update = async (payload: SsbReport) => {
        try {
            const res = await updateSsbReport(ocId, payload);
            if (!res) {
                toast.error("Failed to update");
                return null;
            }
            toast.success("SSB Report updated");
            return res;
        } catch {
            toast.error("Error updating SSB report");
            return null;
        }
    };

    return { report, fetch, save, update };
}
