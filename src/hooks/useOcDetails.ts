"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import { fetchOCById } from "@/app/lib/api/ocApi";
import { fetchCourseById } from "@/app/lib/api/courseApi";
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
            const oc = await fetchOCById(ocId);
            if (!oc) return;
            const courseId = oc.course?.id || "";

            const course = await fetchCourseById(courseId) || null;

            setCadet({
                name: oc.name,
                course: courseId ?? "",
                courseName: course?.course?.code || "",
                ocNumber: oc.ocNo,
                ocId: oc.id,
            });
        } catch (err) {
            console.error(err);
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
