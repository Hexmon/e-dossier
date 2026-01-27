import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { apiRequest } from '@/app/lib/apiClient';

interface PhysicalTrainingScore {
    ptTaskScoreId: string;
    marksScored: number;
}

interface PTResponse {
    message: string;
    data: {
        semester?: number;
        scores: Array<{
            id: string;
            ptTaskScoreId: string;
            marksScored: number;
            createdAt: string;
            updatedAt: string;
        }>;
    };
}

interface UsePTReturn {
    scores: PhysicalTrainingScore[];
    template: Array<{
        ptTaskScoreId: string;
        taskTitle: string;
        maxMarks: number;
        semester: number;
    }> | null;
    loading: boolean;
    error: string | null;
    fetchScores: (semester: number) => Promise<void>;
    saveScores: (semester: number, scores: PhysicalTrainingScore[]) => Promise<void>;
    updateScores: (semester: number, scores: PhysicalTrainingScore[], deleteScoreIds?: string[]) => Promise<void>;
    deleteScores: (semester: number, scoreIds?: string[]) => Promise<void>;
}

export function usePhysicalTraining(ocId: string): UsePTReturn {
    const [scores, setScores] = useState<PhysicalTrainingScore[]>([]);
    const [template, setTemplate] = useState<Array<{
        ptTaskScoreId: string;
        taskTitle: string;
        maxMarks: number;
        semester: number;
    }> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchScores = useCallback(
        async (semester: number) => {
            if (!ocId) {
                setError('OC ID is required');
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Cancel previous request if any
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                }

                abortControllerRef.current = new AbortController();

                const data: any = await apiRequest<any>({
                    method: 'GET',
                    endpoint: `/api/v1/oc/${ocId}/physical-training`,
                    query: { semester },
                    signal: abortControllerRef.current.signal,
                });

                setScores(data.data.scores || []);
                setTemplate(data.data.template || null);
            } catch (err) {
                if (err instanceof Error && err.name !== 'AbortError') {
                    const errorMsg = err.message || 'Failed to fetch physical training scores';
                    setError(errorMsg);
                    console.error('Error fetching PT scores:', err);
                }
            } finally {
                setLoading(false);
            }
        },
        [ocId]
    );

    const saveScores = useCallback(
        async (semester: number, scoresData: PhysicalTrainingScore[]) => {
            if (!ocId) {
                toast.error('OC ID is required');
                return;
            }

            if (!scoresData || scoresData.length === 0) {
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const data: PTResponse = await apiRequest<PTResponse, { semester: number; scores: PhysicalTrainingScore[] }>({
                    method: 'POST',
                    endpoint: `/api/v1/oc/${ocId}/physical-training`,
                    body: {
                        semester,
                        scores: scoresData,
                    },
                });

                setScores(data.data.scores || []);
                toast.success('Physical training scores saved successfully');
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Failed to save physical training scores';
                setError(errorMsg);
                toast.error(errorMsg);
                console.error('Error saving PT scores:', err);
            } finally {
                setLoading(false);
            }
        },
        [ocId]
    );

    const updateScores = useCallback(
        async (semester: number, scoresData: PhysicalTrainingScore[], deleteScoreIds?: string[]) => {
            if (!ocId) {
                toast.error('OC ID is required');
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const data: PTResponse = await apiRequest<PTResponse, any>({
                    method: 'PATCH',
                    endpoint: `/api/v1/oc/${ocId}/physical-training`,
                    body: {
                        semester,
                        scores: scoresData && scoresData.length > 0 ? scoresData : undefined,
                        deleteScoreIds: deleteScoreIds && deleteScoreIds.length > 0 ? deleteScoreIds : undefined,
                    },
                });

                setScores(data.data.scores || []);
                toast.success('Physical training scores updated successfully');
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Failed to update physical training scores';
                setError(errorMsg);
                toast.error(errorMsg);
                console.error('Error updating PT scores:', err);
            } finally {
                setLoading(false);
            }
        },
        [ocId]
    );

    const deleteScores = useCallback(
        async (semester: number, scoreIds?: string[]) => {
            if (!ocId) {
                toast.error('OC ID is required');
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const data: PTResponse = await apiRequest<PTResponse, any>({
                    method: 'DELETE',
                    endpoint: `/api/v1/oc/${ocId}/physical-training`,
                    body: {
                        semester,
                        scoreIds: scoreIds && scoreIds.length > 0 ? scoreIds : undefined,
                    },
                });

                await fetchScores(semester);
                toast.success('Physical training scores deleted successfully');
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Failed to delete physical training scores';
                setError(errorMsg);
                toast.error(errorMsg);
                console.error('Error deleting PT scores:', err);
            } finally {
                setLoading(false);
            }
        },
        [ocId, fetchScores]
    );

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return {
        scores,
        template,
        loading,
        error,
        fetchScores,
        saveScores,
        updateScores,
        deleteScores,
    };
}
