'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PTBulkFilters } from '@/components/physic-training/bulk/PTBulkFilters';
import { PTBulkScoresTable } from '@/components/physic-training/bulk/PTBulkScoresTable';
import { PTBulkMotivationTable } from '@/components/physic-training/bulk/PTBulkMotivationTable';
import { PTBulkSaveSummary } from '@/components/physic-training/bulk/PTBulkSaveSummary';
import {
    buildBulkPTSaveRequest,
    usePhysicalTrainingBulk,
    type PTBulkFilters as PTBulkFiltersType,
} from '@/hooks/usePhysicalTrainingBulk';
import type { PTBulkSaveResponse } from '@/app/lib/api/physicalTrainingBulkApi';

function removeFromClearRecord(record: Record<string, string[]>, ocId: string, refId: string) {
    const next = { ...record };
    next[ocId] = (next[ocId] ?? []).filter((item) => item !== refId);
    return next;
}

export function PTBulkManagePageContent() {
    const [filters, setFilters] = useState<PTBulkFiltersType>({
        courseId: '',
        semester: null,
        active: true,
        q: '',
        platoon: '',
    });
    const [activeTab, setActiveTab] = useState<'scores' | 'motivation'>('scores');
    const [selectedTypeCode, setSelectedTypeCode] = useState('');

    const [scoreDraftValues, setScoreDraftValues] = useState<Record<string, Record<string, string>>>({});
    const [motivationDraftValues, setMotivationDraftValues] = useState<Record<string, Record<string, string>>>({});
    const [clearScoreIds, setClearScoreIds] = useState<Record<string, string[]>>({});
    const [clearMotivationFieldIds, setClearMotivationFieldIds] = useState<Record<string, string[]>>({});
    const [saveSummary, setSaveSummary] = useState<PTBulkSaveResponse | null>(null);

    const { coursesQuery, platoonsQuery, bulkQuery, saveMutation } = usePhysicalTrainingBulk(filters);

    useEffect(() => {
        if (!bulkQuery.data?.template?.types?.length) {
            setSelectedTypeCode('');
            return;
        }
        setSelectedTypeCode((prev) => {
            if (!prev) return bulkQuery.data!.template.types[0].code;
            const exists = bulkQuery.data!.template.types.some((type) => type.code === prev);
            return exists ? prev : bulkQuery.data!.template.types[0].code;
        });
    }, [bulkQuery.data]);

    useEffect(() => {
        setScoreDraftValues({});
        setMotivationDraftValues({});
        setClearScoreIds({});
        setClearMotivationFieldIds({});
        setSaveSummary(null);
    }, [filters.courseId, filters.semester, filters.active, filters.q, filters.platoon]);

    const scoreMaxById = useMemo(() => {
        const map = new Map<string, number>();
        const types = bulkQuery.data?.template?.types ?? [];
        for (const type of types) {
            for (const task of type.tasks ?? []) {
                for (const attempt of task.attempts ?? []) {
                    for (const grade of attempt.grades ?? []) {
                        if (!grade.scoreId) continue;
                        const max = typeof grade.maxMarks === 'number' ? grade.maxMarks : task.maxMarks;
                        map.set(grade.scoreId, max);
                    }
                }
            }
        }
        return map;
    }, [bulkQuery.data]);

    const handleSave = async () => {
        const data = bulkQuery.data;
        if (!data) {
            toast.error('Load data first.');
            return;
        }

        for (const [ocId, scoreMap] of Object.entries(scoreDraftValues)) {
            for (const [scoreId, raw] of Object.entries(scoreMap)) {
                const trimmed = raw.trim();
                if (!trimmed) continue;
                const numeric = Number(trimmed);
                if (!Number.isFinite(numeric) || numeric < 0) {
                    toast.error(`Invalid score for ${ocId}. Use non-negative numbers only.`);
                    return;
                }
                const max = scoreMaxById.get(scoreId);
                if (max !== undefined && numeric > max) {
                    toast.error(`Marks cannot exceed ${max}.`);
                    return;
                }
            }
        }

        const payload = buildBulkPTSaveRequest({
            filters,
            data,
            scoreDraftValues,
            motivationDraftValues,
            clearScoreIds,
            clearMotivationFieldIds,
        });

        if (!payload) {
            toast.message('No changed values to save.');
            return;
        }

        try {
            const result = await saveMutation.mutateAsync(payload);
            setSaveSummary(result);
            toast.success(`Saved: ${result.successCount}, Failed: ${result.errorCount}`);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to save PT bulk updates.';
            toast.error(msg);
        }
    };

    return (
        <div className="space-y-6">
            <PTBulkFilters
                courseId={filters.courseId}
                semester={filters.semester}
                active={filters.active}
                q={filters.q}
                platoon={filters.platoon}
                courses={coursesQuery.data ?? []}
                platoons={platoonsQuery.data ?? []}
                loadingCourses={coursesQuery.isLoading}
                loadingPlatoons={platoonsQuery.isLoading}
                onCourseChange={(value) => setFilters((prev) => ({ ...prev, courseId: value, semester: null }))}
                onSemesterChange={(value) => setFilters((prev) => ({ ...prev, semester: value }))}
                onActiveChange={(value) => setFilters((prev) => ({ ...prev, active: value }))}
                onQueryChange={(value) => setFilters((prev) => ({ ...prev, q: value }))}
                onPlatoonChange={(value) => setFilters((prev) => ({ ...prev, platoon: value }))}
            />

            {filters.courseId && filters.semester ? (
                <>
                    {bulkQuery.isLoading ? (
                        <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading PT records...</div>
                    ) : bulkQuery.error ? (
                        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                            {(bulkQuery.error as Error).message}
                        </div>
                    ) : bulkQuery.data ? (
                        <>
                            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'scores' | 'motivation')}>
                                <TabsList>
                                    <TabsTrigger value="scores">Scores</TabsTrigger>
                                    <TabsTrigger value="motivation">Motivation</TabsTrigger>
                                </TabsList>
                                <TabsContent value="scores" className="mt-4">
                                    <PTBulkScoresTable
                                        template={bulkQuery.data.template}
                                        items={bulkQuery.data.items}
                                        selectedTypeCode={selectedTypeCode}
                                        onSelectedTypeCodeChange={setSelectedTypeCode}
                                        scoreDraftValues={scoreDraftValues}
                                        clearScoreIds={clearScoreIds}
                                        onScoreChange={(ocId, scoreId, value) => {
                                            setScoreDraftValues((prev) => ({
                                                ...prev,
                                                [ocId]: {
                                                    ...(prev[ocId] ?? {}),
                                                    [scoreId]: value,
                                                },
                                            }));
                                            setClearScoreIds((prev) => removeFromClearRecord(prev, ocId, scoreId));
                                        }}
                                        onToggleClearScore={(ocId, scoreId) => {
                                            setClearScoreIds((prev) => {
                                                const current = new Set(prev[ocId] ?? []);
                                                if (current.has(scoreId)) current.delete(scoreId);
                                                else current.add(scoreId);
                                                return { ...prev, [ocId]: Array.from(current) };
                                            });
                                            setScoreDraftValues((prev) => {
                                                if (!prev[ocId]?.[scoreId]) return prev;
                                                const next = { ...prev };
                                                next[ocId] = { ...(next[ocId] ?? {}) };
                                                delete next[ocId][scoreId];
                                                return next;
                                            });
                                        }}
                                    />
                                </TabsContent>
                                <TabsContent value="motivation" className="mt-4">
                                    <PTBulkMotivationTable
                                        template={bulkQuery.data.template}
                                        items={bulkQuery.data.items}
                                        motivationDraftValues={motivationDraftValues}
                                        clearMotivationFieldIds={clearMotivationFieldIds}
                                        onMotivationChange={(ocId, fieldId, value) => {
                                            setMotivationDraftValues((prev) => ({
                                                ...prev,
                                                [ocId]: {
                                                    ...(prev[ocId] ?? {}),
                                                    [fieldId]: value,
                                                },
                                            }));
                                            setClearMotivationFieldIds((prev) => removeFromClearRecord(prev, ocId, fieldId));
                                        }}
                                        onToggleClearMotivation={(ocId, fieldId) => {
                                            setClearMotivationFieldIds((prev) => {
                                                const current = new Set(prev[ocId] ?? []);
                                                if (current.has(fieldId)) current.delete(fieldId);
                                                else current.add(fieldId);
                                                return { ...prev, [ocId]: Array.from(current) };
                                            });
                                            setMotivationDraftValues((prev) => {
                                                if (!prev[ocId]?.[fieldId]) return prev;
                                                const next = { ...prev };
                                                next[ocId] = { ...(next[ocId] ?? {}) };
                                                delete next[ocId][fieldId];
                                                return next;
                                            });
                                        }}
                                    />
                                </TabsContent>
                            </Tabs>

                            <div className="flex items-center justify-end gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setScoreDraftValues({});
                                        setMotivationDraftValues({});
                                        setClearScoreIds({});
                                        setClearMotivationFieldIds({});
                                    }}
                                >
                                    Reset Draft
                                </Button>
                                <Button onClick={handleSave} disabled={saveMutation.isPending}>
                                    {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>

                            <PTBulkSaveSummary result={saveSummary} />
                        </>
                    ) : null}
                </>
            ) : (
                <div className="rounded-md border p-4 text-sm text-muted-foreground">
                    Select course and semester to load bulk PT data.
                </div>
            )}
        </div>
    );
}
