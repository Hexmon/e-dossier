// src/hooks/useCampData.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import {
    getAllTrainingCamps,
    getOcCamps,
    getOcCampByName,
    createOcCamp,
    updateOcCamp,
    deleteOcCamp,
    TrainingCamp,
    OcCamp,
    CreateOcCampPayload,
    UpdateOcCampPayload,
} from "@/app/lib/api/campApi";

/* =========================================================
   OC CAMPS
========================================================= */

interface UseCampDataReturn {
    camps: OcCamp[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

/**
 * Fetch all OC camps for a specific OC
 */
export const useOcCamps = (ocId: string): UseCampDataReturn => {
    const [camps, setCamps] = useState<OcCamp[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCamps = useCallback(async () => {
        if (!ocId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const { camps: fetchedCamps } = await getOcCamps(ocId, {
                withReviews: true,
                withActivities: true,
            });
            setCamps(fetchedCamps ?? []);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Failed to fetch camps";
            setError(message);
            console.error("Error fetching OC camps:", err);
        } finally {
            setLoading(false);
        }
    }, [ocId]);

    useEffect(() => {
        fetchCamps();
    }, [fetchCamps]);

    return { camps, loading, error, refetch: fetchCamps };
};

/* =========================================================
   ALL OC CAMPS (FOR TOTALS)
========================================================= */

interface UseAllOcCampsReturn {
    camps: OcCamp[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

/**
 * Fetch all OC camps with activities (used for totals)
 */
export const useAllOcCamps = (ocId: string): UseAllOcCampsReturn => {
    const [camps, setCamps] = useState<OcCamp[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAllCamps = useCallback(async () => {
        if (!ocId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const { camps: fetchedCamps } = await getOcCamps(ocId, {
                withReviews: false,
                withActivities: true,
            });
            setCamps(fetchedCamps ?? []);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Failed to fetch all camps";
            setError(message);
            console.error("Error fetching all OC camps:", err);
        } finally {
            setLoading(false);
        }
    }, [ocId]);

    useEffect(() => {
        fetchAllCamps();
    }, [fetchAllCamps]);

    return { camps, loading, error, refetch: fetchAllCamps };
};

/* =========================================================
   SINGLE OC CAMP BY NAME
========================================================= */

interface UseOcCampByNameReturn {
    camp: OcCamp | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

/**
 * Fetch a specific OC camp by name
 */
export const useOcCampByName = (
    ocId: string,
    campName: string | null
): UseOcCampByNameReturn => {
    const [camp, setCamp] = useState<OcCamp | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCamp = useCallback(async () => {
        if (!ocId || !campName) {
            setLoading(false);
            setCamp(null);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const { camps } = await getOcCampByName(ocId, campName, {
                withReviews: true,
                withActivities: true,
            });
            setCamp(camps?.[0] ?? null);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Failed to fetch camp";
            setError(message);
            console.error("Error fetching OC camp by name:", err);
            setCamp(null);
        } finally {
            setLoading(false);
        }
    }, [ocId, campName]);

    useEffect(() => {
        fetchCamp();
    }, [fetchCamp]);

    return { camp, loading, error, refetch: fetchCamp };
};

/* =========================================================
   TRAINING CAMPS (ADMIN)
========================================================= */

interface UseTrainingCampsReturn {
    trainingCamps: TrainingCamp[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

/**
 * Fetch all training camps
 */
export const useTrainingCamps = (): UseTrainingCampsReturn => {
    const [trainingCamps, setTrainingCamps] = useState<TrainingCamp[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTrainingCamps = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const { items } = await getAllTrainingCamps({
                includeActivities: true,
                includeReviews: true,
                includeDeleted: false,
            });
            setTrainingCamps(items ?? []);
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Failed to fetch training camps";
            setError(message);
            console.error("Error fetching training camps:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTrainingCamps();
    }, [fetchTrainingCamps]);

    return { trainingCamps, loading, error, refetch: fetchTrainingCamps };
};

/* =========================================================
   CAMP MUTATIONS
========================================================= */

interface UseCampMutationsReturn {
    createCamp: (payload: CreateOcCampPayload) => Promise<OcCamp | null>;
    updateCamp: (payload: UpdateOcCampPayload) => Promise<OcCamp | null>;
    deleteCamp: (ocCampId: string) => Promise<boolean>;
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    mutationError: string | null;
}

/**
 * Create / Update / Delete OC camps
 */
export const useCampMutations = (ocId: string): UseCampMutationsReturn => {
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [mutationError, setMutationError] = useState<string | null>(null);

    const createCamp = useCallback(
        async (payload: CreateOcCampPayload): Promise<OcCamp | null> => {
            if (!ocId) {
                setMutationError("OC ID is required");
                return null;
            }

            try {
                setIsCreating(true);
                setMutationError(null);
                const { camp } = await createOcCamp(ocId, payload);
                return camp;
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : "Failed to create camp";
                setMutationError(message);
                console.error("Error creating camp:", err);
                return null;
            } finally {
                setIsCreating(false);
            }
        },
        [ocId]
    );

    const updateCamp = useCallback(
        async (payload: UpdateOcCampPayload): Promise<OcCamp | null> => {
            if (!ocId) {
                setMutationError("OC ID is required");
                return null;
            }

            try {
                setIsUpdating(true);
                setMutationError(null);
                const { camp } = await updateOcCamp(ocId, payload);
                return camp;
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : "Failed to update camp";
                setMutationError(message);
                console.error("Error updating camp:", err);
                return null;
            } finally {
                setIsUpdating(false);
            }
        },
        [ocId]
    );

    const deleteCamp = useCallback(
        async (ocCampId: string): Promise<boolean> => {
            if (!ocId || !ocCampId) {
                setMutationError("OC ID and Camp ID are required");
                return false;
            }

            try {
                setIsDeleting(true);
                setMutationError(null);
                const { success } = await deleteOcCamp(ocId, ocCampId);
                return success;
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : "Failed to delete camp";
                setMutationError(message);
                console.error("Error deleting camp:", err);
                return false;
            } finally {
                setIsDeleting(false);
            }
        },
        [ocId]
    );

    return {
        createCamp,
        updateCamp,
        deleteCamp,
        isCreating,
        isUpdating,
        isDeleting,
        mutationError,
    };
};

/* =========================================================
   CAMP TOTALS
========================================================= */

interface CampTotal {
    obtained: number;
    max: number;
}

interface UseCampTotalsReturn {
    campTotals: Record<string, CampTotal>;
    totalSum: CampTotal;
}

/**
 * Compute totals from all OC camps
 * (Used for TECHNO TAC CAMP total table)
 */
export const useCampTotals = (
    allCamps: OcCamp[] | undefined
): UseCampTotalsReturn => {
    const campTotals = useMemo<Record<string, CampTotal>>(() => {
        if (!allCamps || allCamps.length === 0) return {};

        return allCamps.reduce<Record<string, CampTotal>>((acc, camp) => {
            const { campName, totalMarksScored, activities } = camp;
            if (!campName) return acc;

            const maxMarks = activities.reduce(
                (sum, activity) => sum + Number(activity.maxMarks ?? 0),
                0
            );

            acc[campName] = {
                obtained: Number(totalMarksScored ?? 0),
                max: maxMarks,
            };

            return acc;
        }, {});
    }, [allCamps]);

    const totalSum = useMemo<CampTotal>(() => {
        const values = Object.values(campTotals);
        return {
            obtained: values.reduce((s, v) => s + v.obtained, 0),
            max: values.reduce((s, v) => s + v.max, 0),
        };
    }, [campTotals]);

    return { campTotals, totalSum };
};
