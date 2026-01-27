import { useState, useCallback, useEffect } from 'react';
import { apiRequest } from '@/app/lib/apiClient';

interface SwimmingTemplate {
    ptTaskScoreId: string;
    taskTitle: string;
    maxMarks: number;
    semester: number;
    ptTypeCode: string;
    attemptCode: string;
    gradeCode: string;
}

interface UseSwimmingTemplatesReturn {
    templates: SwimmingTemplate[] | null;
    loading: boolean;
    error: string | null;
    fetchTemplates: (semester: number) => Promise<void>;
}

export function useSwimmingTemplates(): UseSwimmingTemplatesReturn {
    const [templates, setTemplates] = useState<SwimmingTemplate[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTemplates = useCallback(async (semester: number) => {
        try {
            setLoading(true);
            setError(null);

            const data: any = await apiRequest<any>({
                method: 'GET',
                endpoint: '/api/v1/admin/physical-training/templates',
                query: { semester },
            });

            // Filter for SWIMMING type only
            const swimmingTemplates = data.data.types
                .filter((type: any) => type.code === 'SWIMMING')
                .flatMap((type: any) =>
                    type.tasks.flatMap((task: any) =>
                        task.attempts.flatMap((attempt: any) =>
                            attempt.grades.map((grade: any) => ({
                                ptTaskScoreId: grade.scoreId,
                                taskTitle: task.title,
                                maxMarks: grade.maxMarks,
                                semester: type.semester,
                                ptTypeCode: type.code,
                                attemptCode: attempt.code,
                                gradeCode: grade.code,
                            }))
                        )
                    )
                );

            setTemplates(swimmingTemplates);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to fetch swimming templates';
            setError(errorMsg);
            console.error('Error fetching swimming templates:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        templates,
        loading,
        error,
        fetchTemplates,
    };
}
