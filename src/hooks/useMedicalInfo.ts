// hooks/useMedicalInfo.ts
"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
    getMedicalInfo,
    saveMedicalInfo,
    updateMedicalInfo,
    deleteMedicalInfo,
} from "@/app/lib/api/medinfoApi";

import type { MedInfoRow, MedicalInfoForm } from "@/types/med-records";

/**
 * Backend save expects objects shaped like:
 * { semester, examDate, age, heightCm, ibwKg, abwKg, overwtPct, bmi, chestCm, medicalHistory, hereditaryIssues, allergies }
 *
 * We declare a narrow type for the save input so component can build that shape safely.
 */
export type MedicalInfoSaveItem = {
    semester?: number;
    examDate?: string | null;
    age?: number;
    heightCm?: number;
    ibwKg?: number;
    abwKg?: number;
    overwtPct?: number;
    bmi?: number;
    chestCm?: number;
    medicalHistory?: string;
    hereditaryIssues?: string;
    allergies?: string;
};

export function useMedicalInfo(ocId: string) {
    const [items, setItems] = useState<MedInfoRow[]>([]);
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async () => {
        if (!ocId) return;

        try {
            setLoading(true);
            const data = await getMedicalInfo(ocId);

            const normalized: MedInfoRow[] = (Array.isArray(data) ? data : []).map((item) => ({
                id: item.id,
                term: item.semester ? `TERM ${item.semester}` : "TERM -",
                date: (item.date ?? item.examDate ?? "").split("T")[0] ?? "",
                age: String(item.age ?? ""),
                height: String(item.heightCm ?? ""),
                ibw: String(item.ibwKg ?? ""),
                abw: String(item.abwKg ?? ""),
                overw: String(item.overwtPct ?? ""),
                bmi: String(item.bmi ?? ""),
                chest: String(item.chestCm ?? ""),
                medicalHistory: item.medicalHistory ?? "",
                medicalIssues: item.hereditaryIssues ?? "",
                allergies: item.allergies ?? "",
            } as unknown as MedInfoRow));

            setItems(normalized);
        } catch {
            toast.error("Failed to load medical info.");
        } finally {
            setLoading(false);
        }
    }, [ocId]);

    const save = useCallback(
        async (payload: MedicalInfoSaveItem[]) => {
            if (!ocId) return null;

            try {
                const response = await saveMedicalInfo(
                    ocId,
                    payload.map((r) => ({
                        semester: Number(r.semester) || 1,
                        examDate: typeof r.examDate === "string" ? r.examDate : null,
                        age: Number(r.age ?? 0),
                        heightCm: Number(r.heightCm ?? 0),
                        ibwKg: Number(r.ibwKg ?? 0),
                        abwKg: Number(r.abwKg ?? 0),
                        overwtPct: Number(r.overwtPct ?? 0),
                        bmi: Number(r.bmi ?? 0),
                        chestCm: Number(r.chestCm ?? 0),
                        medicalHistory: r.medicalHistory ?? "",
                        hereditaryIssues: r.hereditaryIssues ?? "",
                        allergies: r.allergies ?? "",
                    }))
                );

                if (!response) {
                    toast.error("Failed to save medical info.");
                    return null;
                }

                toast.success("Medical info saved.");
                await fetch();
                return response;
            } catch {
                toast.error("Failed to save medical info.");
                return null;
            }
        },
        [ocId, fetch]
    );

    const update = useCallback(
        async (id: string, payload: Partial<MedicalInfoSaveItem>) => {
            if (!ocId) return null;
            try {
                const body: Record<string, unknown> = {
                    examDate: payload.examDate ?? undefined,
                    age: payload.age !== undefined ? Number(payload.age) : undefined,
                    heightCm: payload.heightCm !== undefined ? Number(payload.heightCm) : undefined,
                    ibwKg: payload.ibwKg !== undefined ? Number(payload.ibwKg) : undefined,
                    abwKg: payload.abwKg !== undefined ? Number(payload.abwKg) : undefined,
                    overwtPct: payload.overwtPct !== undefined ? Number(payload.overwtPct) : undefined,
                    bmi: payload.bmi !== undefined ? Number(payload.bmi) : undefined,
                    chestCm: payload.chestCm !== undefined ? Number(payload.chestCm) : undefined,
                };

                await updateMedicalInfo(ocId, id, body);
                toast.success("Medical record updated");
                await fetch();
                return true;
            } catch {
                toast.error("Failed to update medical record");
                return false;
            }
        },
        [ocId, fetch]
    );

    const remove = useCallback(
        async (id: string) => {
            if (!ocId) return false;
            try {
                await deleteMedicalInfo(ocId, id);
                toast.success("Record deleted");
                await fetch();
                return true;
            } catch {
                toast.error("Failed to delete record");
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
