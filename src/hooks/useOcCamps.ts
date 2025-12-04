"use client";

import { useEffect, useState, useCallback } from "react";
import { Cadet } from "@/types/cadet";
import {
    getOcCamps,
    createOcCamp,
    updateOcCamp,
    deleteOcCampData,
    OcCamp,
    OcCampQueryParams,
    UpsertOcCampInput,
    UpdateOcCampInput,
    OcCampsResponse,
} from "@/app/lib/api/ocCampApi";
import { toast } from "sonner";
import { fetchOCById } from "@/app/lib/api/ocApi";
import { fetchCourseById } from "@/app/lib/api/courseApi";

// Hook for managing OC camps list
export function useOcCamps(ocId?: string | null, params?: OcCampQueryParams) {
    const [cadet, setCadet] = useState<Cadet | null>(null);
    const [loadingCadet, setLoadingCadet] = useState(false);
    const [camps, setCamps] = useState<OcCamp[]>([]);
    const [grandTotalMarksScored, setGrandTotalMarksScored] = useState(0);
    const [loading, setLoading] = useState(false);



    const loadCadet = useCallback(async () => {
            if (!ocId) return;
            setLoadingCadet(true);
            try {
                const oc = await fetchOCById(ocId);
                if (!oc) return;
    
                const courseRes = await fetchCourseById(oc.courseId);
    
                const data: Cadet = {
                    name: oc.name ?? "",
                    course: oc.courseId ?? "",
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

    const loadCamps = useCallback(async () => {
        if (!ocId) return;
        setLoading(true);
        try {
            const response = await getOcCamps(ocId, params);
            setCamps(response.camps);
            setGrandTotalMarksScored(response.grandTotalMarksScored);
        } catch (err) {
            console.error("loadCamps error", err);
            toast.error("Failed to load OC camps");
        } finally {
            setLoading(false);
        }
    }, [ocId, params?.semester, params?.campName, params?.withReviews, params?.withActivities, params?.reviewRole, params?.activityName]);

    useEffect(() => {
        if (!ocId) return;
        loadCadet();
        loadCamps();
    }, [ocId,loadCamps, loadCadet]);

    const createCamp = useCallback(
        async (payload: UpsertOcCampInput) => {
            if (!ocId) {
                toast.error("No OC selected");
                return null;
            }
            try {
                const response = await createOcCamp(ocId, payload);
                toast.success("OC camp created successfully!");
                setCamps(response.camps);
                setGrandTotalMarksScored(response.grandTotalMarksScored);
                return response;
            } catch (err) {
                console.error("createCamp error", err);
                toast.error("Error creating OC camp");
                throw err;
            }
        },
        [ocId]
    );

    const removeCamp = useCallback(
        async (ocCampId: string) => {
            if (!ocId) {
                toast.error("No OC selected");
                return;
            }
            try {
                const response = await deleteOcCampData(ocId, { ocCampId });
                toast.success("OC camp deleted successfully!");
                setCamps(response.camps);
                setGrandTotalMarksScored(response.grandTotalMarksScored);
            } catch (err) {
                console.error("removeCamp error", err);
                toast.error("Error deleting OC camp");
                throw err;
            }
        },
        [ocId]
    );

    const removeReview = useCallback(
        async (reviewId: string) => {
            if (!ocId) {
                toast.error("No OC selected");
                return;
            }
            try {
                const response = await deleteOcCampData(ocId, { reviewId });
                toast.success("Review deleted successfully!");
                setCamps(response.camps);
                setGrandTotalMarksScored(response.grandTotalMarksScored);
            } catch (err) {
                console.error("removeReview error", err);
                toast.error("Error deleting review");
                throw err;
            }
        },
        [ocId]
    );

    const removeActivityScore = useCallback(
        async (activityScoreId: string) => {
            if (!ocId) {
                toast.error("No OC selected");
                return;
            }
            try {
                const response = await deleteOcCampData(ocId, { activityScoreId });
                toast.success("Activity score deleted successfully!");
                setCamps(response.camps);
                setGrandTotalMarksScored(response.grandTotalMarksScored);
            } catch (err) {
                console.error("removeActivityScore error", err);
                toast.error("Error deleting activity score");
                throw err;
            }
        },
        [ocId]
    );

    return {
        ocId,
        cadet,
        loadingCadet,
        camps,
        grandTotalMarksScored,
        loading,
        reload: async () => {
            await Promise.all([loadCadet(), loadCamps()]);
        }, 
        loadCamps,
        loadCadet,
        createCamp,
        removeCamp,
        removeReview,
        removeActivityScore,
    };
}

// Hook for managing a single OC camp
export function useOcCamp(ocId?: string | null, ocCampId?: string | null) {
    const [camp, setCamp] = useState<OcCamp | null>(null);
    const [grandTotalMarksScored, setGrandTotalMarksScored] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const loadCamp = useCallback(async () => {
        if (!ocId) return;
        setLoading(true);
        try {
            const response = await getOcCamps(ocId, {
                withReviews: true,
                withActivities: true,
            });
            
            // Find the specific camp
            const foundCamp = response.camps.find((c: any) => c.id === ocCampId);
            setCamp(foundCamp || null);
            setGrandTotalMarksScored(response.grandTotalMarksScored);
        } catch (err) {
            console.error("loadCamp error", err);
            toast.error("Failed to load OC camp");
        } finally {
            setLoading(false);
        }
    }, [ocId, ocCampId]);

    useEffect(() => {
        loadCamp();
    }, [loadCamp]);

    const saveCamp = useCallback(
        async (payload: UpdateOcCampInput) => {
            if (!ocId) {
                toast.error("No OC selected");
                return null;
            }
            setIsSaving(true);
            try {
                const response = await updateOcCamp(ocId, payload);
                toast.success("OC camp updated successfully!");
                
                const foundCamp = response.camps.find((c: any) => c.id === ocCampId);
                setCamp(foundCamp || null);
                setGrandTotalMarksScored(response.grandTotalMarksScored);
                return response;
            } catch (err) {
                console.error("saveCamp error", err);
                toast.error("Error updating OC camp");
                throw err;
            } finally {
                setIsSaving(false);
            }
        },
        [ocId, ocCampId]
    );

    const removeCamp = useCallback(async () => {
        if (!ocId || !ocCampId) {
            toast.error("No camp selected");
            return;
        }
        try {
            await deleteOcCampData(ocId, { ocCampId });
            toast.success("OC camp deleted successfully!");
            setCamp(null);
        } catch (err) {
            console.error("removeCamp error", err);
            toast.error("Error deleting OC camp");
            throw err;
        }
    }, [ocId, ocCampId]);

    const removeReview = useCallback(
        async (reviewId: string) => {
            if (!ocId) {
                toast.error("No OC selected");
                return;
            }
            try {
                const response = await deleteOcCampData(ocId, { reviewId });
                toast.success("Review deleted successfully!");
                
                const foundCamp = response.camps.find((c: any) => c.id === ocCampId);
                setCamp(foundCamp || null);
                setGrandTotalMarksScored(response.grandTotalMarksScored);
            } catch (err) {
                console.error("removeReview error", err);
                toast.error("Error deleting review");
                throw err;
            }
        },
        [ocId, ocCampId]
    );

    const removeActivityScore = useCallback(
        async (activityScoreId: string) => {
            if (!ocId) {
                toast.error("No OC selected");
                return;
            }
            try {
                const response = await deleteOcCampData(ocId, { activityScoreId });
                toast.success("Activity score deleted successfully!");
                
                const foundCamp = response.camps.find((c: any) => c.id === ocCampId);
                setCamp(foundCamp || null);
                setGrandTotalMarksScored(response.grandTotalMarksScored);
            } catch (err) {
                console.error("removeActivityScore error", err);
                toast.error("Error deleting activity score");
                throw err;
            }
        },
        [ocId, ocCampId]
    );

    return {
        ocId,
        ocCampId,
        camp,
        grandTotalMarksScored,
        loading,
        isSaving,
        reload: loadCamp,
        saveCamp,
        removeCamp,
        removeReview,
        removeActivityScore,
        setCamp,
    };
}
