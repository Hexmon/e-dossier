"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import { fetchOCById, type OCListRow } from "@/app/lib/api/ocApi";
import { Cadet } from "@/types/cadet";

export function useOcDetails(ocId?: string) {
    const [cadet, setCadet] = useState<Cadet | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!ocId) return;

        setLoading(true);
        setError(null);

        try {
            const oc: OCListRow | null = await fetchOCById(ocId);
            if (!oc || !oc.course) return;

            setCadet({
                name: oc.name,
                course: oc.course.id,
                courseName: oc.course.code || "",
                ocNumber: oc.ocNo,
                ocId: oc.id,
            });
        } catch (err) {
            setError("Failed to load cadet details");
            toast.error("Error loading OC");
        } finally {
            setLoading(false);
        }
    }, [ocId]);

    useEffect(() => {
        load();
    }, [load]);

    return {
        cadet,
        loading,
        error,
        refresh: load,
    };
}
