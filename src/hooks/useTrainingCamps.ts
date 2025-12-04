"use client";

import { useEffect, useState, useCallback } from "react";
import {
    listTrainingCamps,
    getTrainingCamp,
    createTrainingCamp,
    updateTrainingCamp,
    deleteTrainingCamp,
    listTrainingCampActivities,
    getTrainingCampActivity,
    createTrainingCampActivity,
    updateTrainingCampActivity,
    deleteTrainingCampActivity,
    TrainingCamp,
    TrainingCampWithActivities,
    TrainingCampActivity,
    CreateCampInput,
    UpdateCampInput,
    CreateActivityInput,
    UpdateActivityInput,
    ListCampsParams,
    ListActivitiesParams,
} from "@/app/lib/api/campApi";
import { toast } from "sonner";

// Hook for managing training camps list
export function useTrainingCamps(params?: ListCampsParams) {
    const [camps, setCamps] = useState<TrainingCamp[] | TrainingCampWithActivities[]>([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const loadCamps = useCallback(async () => {
        setLoading(true);
        try {
            const response = await listTrainingCamps(params);
            setCamps(response.items);
            setCount(response.count);
        } catch (err) {
            console.error("loadCamps error", err);
            toast.error("Failed to load training camps");
        } finally {
            setLoading(false);
        }
    }, [params?.semester, params?.includeActivities, params?.includeDeleted]);

    useEffect(() => {
        loadCamps();
    }, [loadCamps]);

    const createCamp = useCallback(async (payload: CreateCampInput) => {
        try {
            const saved = await createTrainingCamp(payload);
            toast.success("Training camp created successfully!");
            await loadCamps();
            return saved;
        } catch (err) {
            console.error("createCamp error", err);
            toast.error("Error creating training camp");
            throw err;
        }
    }, [loadCamps]);

    const removeCamp = useCallback(async (campId: string, hardDelete?: boolean) => {
        try {
            await deleteTrainingCamp(campId, hardDelete);
            toast.success(hardDelete ? "Training camp deleted permanently!" : "Training camp deleted!");
            await loadCamps();
        } catch (err) {
            console.error("removeCamp error", err);
            toast.error("Error deleting training camp");
            throw err;
        }
    }, [loadCamps]);

    return {
        camps,
        count,
        loading,
        reload: loadCamps,
        createCamp,
        removeCamp,
    };
}

// Hook for managing a single training camp
export function useTrainingCamp(campId?: string | null) {
    const [camp, setCamp] = useState<TrainingCamp | TrainingCampWithActivities | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const loadCamp = useCallback(async () => {
        if (!campId) return;
        setLoading(true);
        try {
            const response = await getTrainingCamp(campId, {
                includeActivities: true,
                includeDeleted: false,
            });
            setCamp(response);
        } catch (err) {
            console.error("loadCamp error", err);
            toast.error("Failed to load training camp");
        } finally {
            setLoading(false);
        }
    }, [campId]);

    useEffect(() => {
        loadCamp();
    }, [loadCamp]);

    const saveCamp = useCallback(
        async (payload: UpdateCampInput) => {
            if (!campId) {
                toast.error("No camp selected");
                return null;
            }
            setIsSaving(true);
            try {
                const saved = await updateTrainingCamp(campId, payload);
                toast.success("Training camp updated successfully!");
                setCamp(saved);
                return saved;
            } catch (err) {
                console.error("saveCamp error", err);
                toast.error("Error updating training camp");
                throw err;
            } finally {
                setIsSaving(false);
            }
        },
        [campId]
    );

    const removeCamp = useCallback(
        async (hardDelete?: boolean) => {
            if (!campId) {
                toast.error("No camp selected");
                return;
            }
            try {
                await deleteTrainingCamp(campId, hardDelete);
                toast.success(hardDelete ? "Training camp deleted permanently!" : "Training camp deleted!");
                setCamp(null);
            } catch (err) {
                console.error("removeCamp error", err);
                toast.error("Error deleting training camp");
                throw err;
            }
        },
        [campId]
    );

    return {
        campId,
        camp,
        loading,
        isSaving,
        reload: loadCamp,
        saveCamp,
        removeCamp,
        setCamp,
    };
}

// Hook for managing training camp activities
export function useTrainingCampActivities(campId?: string | null, params?: ListActivitiesParams) {
    const [activities, setActivities] = useState<TrainingCampActivity[]>([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const loadActivities = useCallback(async () => {
        if (!campId) return;
        setLoading(true);
        try {
            const response = await listTrainingCampActivities(campId, params);
            setActivities(response.items);
            setCount(response.count);
        } catch (err) {
            console.error("loadActivities error", err);
            toast.error("Failed to load activities");
        } finally {
            setLoading(false);
        }
    }, [campId, params?.includeDeleted]);

    useEffect(() => {
        loadActivities();
    }, [loadActivities]);

    const createActivity = useCallback(
        async (payload: CreateActivityInput) => {
            if (!campId) {
                toast.error("No camp selected");
                return null;
            }
            setIsSaving(true);
            try {
                const saved = await createTrainingCampActivity(campId, payload);
                toast.success("Activity created successfully!");
                await loadActivities();
                return saved;
            } catch (err) {
                console.error("createActivity error", err);
                toast.error("Error creating activity");
                throw err;
            } finally {
                setIsSaving(false);
            }
        },
        [campId, loadActivities]
    );

    const updateActivity = useCallback(
        async (activityId: string, payload: UpdateActivityInput) => {
            if (!campId) {
                toast.error("No camp selected");
                return null;
            }
            setIsSaving(true);
            try {
                const saved = await updateTrainingCampActivity(campId, activityId, payload);
                toast.success("Activity updated successfully!");
                await loadActivities();
                return saved;
            } catch (err) {
                console.error("updateActivity error", err);
                toast.error("Error updating activity");
                throw err;
            } finally {
                setIsSaving(false);
            }
        },
        [campId, loadActivities]
    );

    const removeActivity = useCallback(
        async (activityId: string, hardDelete?: boolean) => {
            if (!campId) {
                toast.error("No camp selected");
                return;
            }
            try {
                await deleteTrainingCampActivity(campId, activityId, hardDelete);
                toast.success(hardDelete ? "Activity deleted permanently!" : "Activity deleted!");
                await loadActivities();
            } catch (err) {
                console.error("removeActivity error", err);
                toast.error("Error deleting activity");
                throw err;
            }
        },
        [campId, loadActivities]
    );

    return {
        campId,
        activities,
        count,
        loading,
        isSaving,
        reload: loadActivities,
        createActivity,
        updateActivity,
        removeActivity,
    };
}

// Hook for managing a single activity
export function useTrainingCampActivity(campId?: string | null, activityId?: string | null) {
    const [activity, setActivity] = useState<TrainingCampActivity | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const loadActivity = useCallback(async () => {
        if (!campId || !activityId) return;
        setLoading(true);
        try {
            const response = await getTrainingCampActivity(campId, activityId);
            setActivity(response);
        } catch (err) {
            console.error("loadActivity error", err);
            toast.error("Failed to load activity");
        } finally {
            setLoading(false);
        }
    }, [campId, activityId]);

    useEffect(() => {
        loadActivity();
    }, [loadActivity]);

    const saveActivity = useCallback(
        async (payload: UpdateActivityInput) => {
            if (!campId || !activityId) {
                toast.error("No activity selected");
                return null;
            }
            setIsSaving(true);
            try {
                const saved = await updateTrainingCampActivity(campId, activityId, payload);
                toast.success("Activity updated successfully!");
                setActivity(saved);
                return saved;
            } catch (err) {
                console.error("saveActivity error", err);
                toast.error("Error updating activity");
                throw err;
            } finally {
                setIsSaving(false);
            }
        },
        [campId, activityId]
    );

    const removeActivity = useCallback(
        async (hardDelete?: boolean) => {
            if (!campId || !activityId) {
                toast.error("No activity selected");
                return;
            }
            try {
                await deleteTrainingCampActivity(campId, activityId, hardDelete);
                toast.success(hardDelete ? "Activity deleted permanently!" : "Activity deleted!");
                setActivity(null);
            } catch (err) {
                console.error("removeActivity error", err);
                toast.error("Error deleting activity");
                throw err;
            }
        },
        [campId, activityId]
    );

    return {
        campId,
        activityId,
        activity,
        loading,
        isSaving,
        reload: loadActivity,
        saveActivity,
        removeActivity,
        setActivity,
    };
}
