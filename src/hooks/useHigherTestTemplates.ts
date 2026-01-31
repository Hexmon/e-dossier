import { useState, useCallback, useEffect } from 'react';
import { apiRequest } from '@/app/lib/apiClient';

interface HigherTestTemplate {
    ptTaskScoreId: string;
    taskTitle: string;
    maxMarks: number;
    semester: number;
    ptTypeCode: string;
    attemptCode: string;
    gradeCode: string;
}

interface UseHigherTestTemplatesReturn {
    templates: HigherTestTemplate[] | null;
    loading: boolean;
    error: string | null;
    fetchTemplates: (semester: number) => Promise<void>;
}

export function useHigherTestTemplates(): UseHigherTestTemplatesReturn {
    const [templates, setTemplates] = useState<HigherTestTemplate[] | null>(null);
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

            // Filter for HIGHER_TESTS type only
            const higherTestTemplates = data.data.types
                .filter((type: any) => type.code === 'HIGHER_TESTS')
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

            setTemplates(higherTestTemplates);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to fetch higher test templates';
            setError(errorMsg);
            console.error('Error fetching higher test templates:', err);
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
