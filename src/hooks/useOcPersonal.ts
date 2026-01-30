"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchOCById } from "@/app/lib/api/ocApi";
import { fetchCourseById } from "@/app/lib/api/courseApi";
import {
    getOCPersonal,
    createOCPersonal,
    updateOCPersonal,
    OCPersonalRecord,
} from "@/app/lib/api/ocPersonalApi";
import { toast } from "sonner";
import { Cadet } from "@/types/cadet";

export function useOcPersonal(ocId?: string | null) {
    const [cadet, setCadet] = useState<Cadet | null>(null);
    const [personal, setPersonal] = useState<OCPersonalRecord | null>(null);
    const [loadingCadet, setLoadingCadet] = useState(false);
    const [loadingPersonal, setLoadingPersonal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const loadCadet = useCallback(async () => {
        if (!ocId) return;
        setLoadingCadet(true);
        try {
            const oc = await fetchOCById(ocId);
            if (!oc) return;

            const courseRes = await fetchCourseById(oc.course?.id || "");

            const data: Cadet = {
                name: oc.name ?? "",
                course: oc.course?.id ?? "",
                courseName: courseRes?.course?.code ?? "",
                ocNumber: oc.ocNo ?? "",
                ocId: oc.id ?? "",
            };

            setCadet(data);
        } catch (err) {
            console.error("loadCadet error", err);
            toast.error("Failed to load cadet data");
        } finally {
            setLoadingCadet(false);
        }
    }, [ocId]);

    const loadPersonal = useCallback(async () => {
        if (!ocId) return;
        setLoadingPersonal(true);
        try {
            const response = await getOCPersonal(ocId);
            setPersonal(response ?? null);
        } catch (err) {
            console.error("loadPersonal error", err);
            toast.error("Failed to load personal particulars");
        } finally {
            setLoadingPersonal(false);
        }
    }, [ocId]);

    useEffect(() => {
        loadCadet();
        loadPersonal();
    }, [loadCadet, loadPersonal]);

    const savePersonal = useCallback(
        async (payload: any) => {
            if (!ocId) {
                toast.error("No cadet selected");
                return null;
            }
            setIsSaving(true);
            try {
                let saved;
                if (!personal) {
                    saved = await createOCPersonal(ocId, payload);
                    toast.success("Saved successfully!");
                } else {
                    saved = await updateOCPersonal(ocId, payload);
                    toast.success("Updated successfully!");
                }
                setPersonal(saved);
                return saved;
            } catch (err) {
                console.error("savePersonal error", err);
                toast.error("Error saving personal particulars");
                throw err;
            } finally {
                setIsSaving(false);
            }
        },
        [ocId, personal]
    );

    return {
        ocId,
        cadet,
        personal,
        loadingCadet,
        loadingPersonal,
        isSaving,
        reload: async () => {
            await Promise.all([loadCadet(), loadPersonal()]);
        },
        loadPersonal,
        loadCadet,
        savePersonal,
        setPersonal,
    };
}
