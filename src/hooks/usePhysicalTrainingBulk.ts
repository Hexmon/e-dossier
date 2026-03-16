import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { academicsApi } from '@/app/lib/api/academicsMarksApi';
import { getPlatoons } from '@/app/lib/api/platoonApi';
import {
    physicalTrainingBulkApi,
    PTBulkGetResponse,
    PTBulkSaveRequest,
} from '@/app/lib/api/physicalTrainingBulkApi';
import {
    buildAllPTBulkTaskDefinitions,
    buildPTBulkInitialSelections,
    type PTBulkTaskSelection,
} from '@/components/physic-training/bulk/ptBulkScoreHelpers';

export type PTBulkFilters = {
    courseId: string;
    semester: number | null;
    active: boolean;
    q: string;
    platoon: string;
};

export type PTScoreDraftValues = Record<string, Record<string, PTBulkTaskSelection>>;
export type PTMotivationDraftValues = Record<string, Record<string, string>>;
export type PTClearSelections = Record<string, string[]>;

type BuildRequestArgs = {
    filters: PTBulkFilters;
    data: PTBulkGetResponse | null | undefined;
    scoreDraftValues: PTScoreDraftValues;
    motivationDraftValues: PTMotivationDraftValues;
    clearScoreIds: PTClearSelections;
    clearMotivationFieldIds: PTClearSelections;
};

function normalizeText(value: string | null | undefined) {
    return (value ?? '').trim();
}

export function buildBulkPTSaveRequest({
    filters,
    data,
    scoreDraftValues,
    motivationDraftValues,
    clearScoreIds,
    clearMotivationFieldIds,
}: BuildRequestArgs): PTBulkSaveRequest | null {
    if (!filters.courseId || !filters.semester || !data) return null;

    const taskDefinitions = buildAllPTBulkTaskDefinitions(data.template.types);
    const initialSelections = buildPTBulkInitialSelections(data.items, taskDefinitions);
    const initialMotivationValue = new Map<string, string>();

    for (const item of data.items) {
        for (const value of item.motivationValues) {
            initialMotivationValue.set(`${item.oc.id}:${value.fieldId}`, normalizeText(value.value));
        }
    }

    const items: PTBulkSaveRequest['items'] = [];

    for (const item of data.items) {
        const ocId = item.oc.id;
        const scoreUpsert: Array<{ ptTaskScoreId: string; marksScored: number }> = [];
        const motivationUpsert: Array<{ fieldId: string; value?: string | null }> = [];
        const clearScores = new Set<string>();

        const scoreDraftForOc = scoreDraftValues[ocId] ?? {};
        const clearTasksForOc = new Set(clearScoreIds[ocId] ?? []);

        for (const [taskId, draft] of Object.entries(scoreDraftForOc)) {
            if (clearTasksForOc.has(taskId)) continue;

            const trimmed = draft.marks.trim();
            if (!trimmed) continue;
            const numeric = Number(trimmed);
            if (!Number.isFinite(numeric)) continue;
            const rounded = Math.trunc(numeric);
            const initial = initialSelections[ocId]?.[taskId];
            if (initial?.selectedScoreId && initial.selectedScoreId !== draft.selectedScoreId) {
                clearScores.add(initial.selectedScoreId);
            }
            if (
                initial &&
                initial.selectedScoreId === draft.selectedScoreId &&
                Number(initial.marks) === rounded
            ) {
                continue;
            }
            scoreUpsert.push({ ptTaskScoreId: draft.selectedScoreId, marksScored: rounded });
        }

        const motivationDraftForOc = motivationDraftValues[ocId] ?? {};
        for (const [fieldId, raw] of Object.entries(motivationDraftForOc)) {
            const trimmed = normalizeText(raw);
            if (!trimmed) continue;
            const initial = initialMotivationValue.get(`${ocId}:${fieldId}`) ?? '';
            if (initial === trimmed) continue;
            motivationUpsert.push({ fieldId, value: trimmed });
        }

        for (const taskId of clearTasksForOc) {
            const initial = initialSelections[ocId]?.[taskId];
            if (initial?.selectedScoreId) {
                clearScores.add(initial.selectedScoreId);
            }
        }

        const clearMotivation = Array.from(new Set(clearMotivationFieldIds[ocId] ?? []));
        const clearScoreList = Array.from(clearScores);

        if (!scoreUpsert.length && !motivationUpsert.length && !clearScoreList.length && !clearMotivation.length) {
            continue;
        }

        items.push({
            ocId,
            scoresUpsert: scoreUpsert.length ? scoreUpsert : undefined,
            motivationUpsert: motivationUpsert.length ? motivationUpsert : undefined,
            clearScoreIds: clearScoreList.length ? clearScoreList : undefined,
            clearMotivationFieldIds: clearMotivation.length ? clearMotivation : undefined,
        });
    }

    if (!items.length) return null;

    return {
        courseId: filters.courseId,
        semester: filters.semester,
        items,
        failFast: false,
    };
}

export function usePhysicalTrainingBulk(filters: PTBulkFilters) {
    const queryClient = useQueryClient();

    const coursesQuery = useQuery({
        queryKey: ['courses'],
        queryFn: () => academicsApi.getCourses().then((res) => res.items ?? []),
    });

    const platoonsQuery = useQuery({
        queryKey: ['platoons'],
        queryFn: () => getPlatoons(),
    });

    const bulkQuery = useQuery({
        queryKey: ['pt-bulk', filters.courseId, filters.semester, filters.active, filters.q, filters.platoon],
        queryFn: () =>
            physicalTrainingBulkApi.getBulkPT({
                courseId: filters.courseId,
                semester: filters.semester!,
                active: filters.active,
                q: filters.q.trim() || undefined,
                platoon: filters.platoon || undefined,
            }),
        enabled: Boolean(filters.courseId && filters.semester),
    });

    const saveMutation = useMutation({
        mutationFn: (payload: PTBulkSaveRequest) => physicalTrainingBulkApi.saveBulkPT(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pt-bulk'] });
        },
    });

    return {
        coursesQuery,
        platoonsQuery,
        bulkQuery,
        saveMutation,
    };
}
