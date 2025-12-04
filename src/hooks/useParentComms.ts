// hooks/useParentComms.ts
"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
    getParentComms,
    saveParentComms,
    updateParentComm,
    deleteParentComm,
} from "@/app/lib/api/parentComnApi";

import type { ParentCommPayload as ApiPayload } from "@/app/lib/api/parentComnApi";


export type ParentCommPayload = ApiPayload;

export type ParentCommRow = {
    id?: string;
    serialNo: string;
    letterNo: string;
    date: string;
    teleCorres: string;
    briefContents: string;
    sigPICdr: string;
    semester?: number;
};

export function useParentComms(ocId: string, semestersCount = 6) {
    const [grouped, setGrouped] = useState<ParentCommRow[][]>(
        Array.from({ length: semestersCount }, () => [])
    );
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async () => {
        if (!ocId) return;

        try {
            setLoading(true);
            const items = await getParentComms(ocId);

            const groups: ParentCommRow[][] = Array.from({ length: semestersCount }, () => []);

            for (const rec of items ?? []) {
                const sem = Math.max(1, Number(rec.semester ?? 1));
                const idx = Math.min(Math.max(0, sem - 1), semestersCount - 1);

                const prev = groups[idx];
                const serialNo = String(prev.length + 1);

                groups[idx].push({
                    id: rec.id,
                    serialNo,
                    letterNo: rec.refNo ?? "-",
                    date: rec.date?.split?.("T")?.[0] ?? "-",
                    teleCorres: rec.subject ?? "-",
                    briefContents: rec.brief ?? "-",
                    sigPICdr: rec.platoonCommanderName ?? "-",
                    semester: sem,
                });
            }

            setGrouped(groups);
        } catch (err) {
            toast.error("Failed to load parent communications");
        } finally {
            setLoading(false);
        }
    }, [ocId, semestersCount]);

    const save = useCallback(
        async (semester: number, payloads: ParentCommPayload[]) => {
            if (!ocId) return null;

            try {
               
                const apiPayloads: ApiPayload[] = payloads.map((p) => ({
                    semester,
                    mode: p.mode as ApiPayload["mode"], // enforce exact API type
                    refNo: p.refNo ?? "",
                    date: p.date ?? "",
                    subject: p.subject ?? "",
                    brief: p.brief ?? "",
                    platoonCommanderName: p.platoonCommanderName ?? "",
                }));

                const resp = await saveParentComms(ocId, apiPayloads);
                if (!resp) {
                    toast.error("Failed to save parent communications");
                    return null;
                }

                toast.success("Saved successfully");
                await fetch();
                return resp;
            } catch (err) {
                toast.error("Failed to save parent communications");
                return null;
            }
        },
        [ocId, fetch]
    );

    const update = useCallback(
        async (id: string, payload: Partial<ParentCommPayload>) => {
            if (!ocId) return null;
            try {
                const apiPayload: Partial<ApiPayload> = {
                    semester: payload.semester,
                    mode: payload.mode as ApiPayload["mode"],
                    refNo: payload.refNo ?? "",
                    date: payload.date ?? "",
                    subject: payload.subject ?? "",
                    brief: payload.brief ?? "",
                    platoonCommanderName: payload.platoonCommanderName ?? "",
                };

                const resp = await updateParentComm(ocId, id, apiPayload);
                if (!resp) {
                    toast.error("Failed to update record");
                    return null;
                }

                toast.success("Record updated");
                await fetch();
                return resp;
            } catch (err) {
                toast.error("Failed to update record");
                return null;
            }
        },
        [ocId, fetch]
    );

    const remove = useCallback(
        async (id: string) => {
            if (!ocId) return null;
            try {
                const resp = await deleteParentComm(ocId, id);
                if (!resp) {
                    toast.error("Failed to delete record");
                    return null;
                }

                toast.success("Deleted");
                await fetch();
                return resp;
            } catch (err) {
                toast.error("Failed to delete record");
                return null;
            }
        },
        [ocId, fetch]
    );

    return {
        grouped,
        loading,
        fetch,
        save,
        update,
        remove,
    };
}
