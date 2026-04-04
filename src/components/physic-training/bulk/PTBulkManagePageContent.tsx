'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PTBulkFilters } from '@/components/physic-training/bulk/PTBulkFilters';
import { PTBulkScoresTable } from '@/components/physic-training/bulk/PTBulkScoresTable';
import { PTBulkMotivationTable } from '@/components/physic-training/bulk/PTBulkMotivationTable';
import { PTBulkSaveSummary } from '@/components/physic-training/bulk/PTBulkSaveSummary';
import {
    buildBulkPTSaveRequest,
    usePhysicalTrainingBulk,
    type PTBulkFilters as PTBulkFiltersType,
    type PTScoreDraftValues,
} from '@/hooks/usePhysicalTrainingBulk';
import type { PTBulkSaveResponse } from '@/app/lib/api/physicalTrainingBulkApi';
import {
    marksWorkflowApi,
    type PtWorkflowDraftPayload,
    type PtWorkflowStateResponse,
    type WorkflowStatus,
} from '@/app/lib/api/marksWorkflowApi';
import {
    buildAllPTBulkTaskDefinitions,
    buildPTBulkInitialSelections,
    type PTBulkTaskSelection,
} from '@/components/physic-training/bulk/ptBulkScoreHelpers';

function removeFromClearRecord(record: Record<string, string[]>, ocId: string, refId: string) {
    const next = { ...record };
    next[ocId] = (next[ocId] ?? []).filter((item) => item !== refId);
    return next;
}

function getStatusTone(status: WorkflowStatus): 'default' | 'secondary' | 'outline' {
    if (status === 'VERIFIED') return 'default';
    if (status === 'PENDING_VERIFICATION') return 'secondary';
    return 'outline';
}

function applyWorkflowDraftMutations(args: {
    basePayload: PtWorkflowDraftPayload;
    scoreDraftValues: PTScoreDraftValues;
    motivationDraftValues: Record<string, Record<string, string>>;
    clearScoreIds: Record<string, string[]>;
    clearMotivationFieldIds: Record<string, string[]>;
}): PtWorkflowDraftPayload {
    const taskDefinitions = buildAllPTBulkTaskDefinitions(args.basePayload.template?.types ?? []);
    const initialSelections = buildPTBulkInitialSelections(args.basePayload.items as any, taskDefinitions);

    return {
        ...args.basePayload,
        items: args.basePayload.items.map((item) => {
            const ocId = item.oc.id;
            const nextScores = [...item.scores];
            const existingSelections = initialSelections[ocId] ?? {};
            const clearTasks = new Set(args.clearScoreIds[ocId] ?? []);

            for (const task of taskDefinitions) {
                const existingSelection = existingSelections[task.taskId];
                const draftSelection = args.scoreDraftValues[ocId]?.[task.taskId];

                if (clearTasks.has(task.taskId)) {
                    if (existingSelection) {
                        const index = nextScores.findIndex((score) => score.ptTaskScoreId === existingSelection.selectedScoreId);
                        if (index >= 0) nextScores.splice(index, 1);
                    }
                    continue;
                }

                if (!draftSelection) continue;

                if (existingSelection && existingSelection.selectedScoreId !== draftSelection.selectedScoreId) {
                    const oldIndex = nextScores.findIndex((score) => score.ptTaskScoreId === existingSelection.selectedScoreId);
                    if (oldIndex >= 0) nextScores.splice(oldIndex, 1);
                }

                const marks = Number(draftSelection.marks.trim() || '0');
                const nextScore = {
                    ptTaskScoreId: draftSelection.selectedScoreId,
                    marksScored: Number.isFinite(marks) ? Math.trunc(marks) : 0,
                    remark: null,
                };

                const currentIndex = nextScores.findIndex((score) => score.ptTaskScoreId === draftSelection.selectedScoreId);
                if (currentIndex >= 0) {
                    nextScores[currentIndex] = nextScore;
                } else {
                    nextScores.push(nextScore);
                }
            }

            const clearedMotivation = new Set(args.clearMotivationFieldIds[ocId] ?? []);
            const nextMotivation = item.motivationValues.filter((entry) => !clearedMotivation.has(entry.fieldId));

            for (const [fieldId, raw] of Object.entries(args.motivationDraftValues[ocId] ?? {})) {
                const trimmed = raw.trim();
                const existingIndex = nextMotivation.findIndex((entry) => entry.fieldId === fieldId);
                if (!trimmed) continue;
                const nextValue = { fieldId, value: trimmed };
                if (existingIndex >= 0) nextMotivation[existingIndex] = nextValue;
                else nextMotivation.push(nextValue);
            }

            return {
                ...item,
                scores: nextScores,
                motivationValues: nextMotivation,
            };
        }),
    };
}

function filterWorkflowItems(payload: PtWorkflowDraftPayload, filters: PTBulkFiltersType): PtWorkflowDraftPayload {
    const q = filters.q.trim().toLowerCase();
    const platoon = filters.platoon.trim().toLowerCase();

    return {
        ...payload,
        items: payload.items.filter((item) => {
            if (filters.active && item.oc.withdrawnOn) return false;
            if (q) {
                const haystack = `${item.oc.name} ${item.oc.ocNo}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            if (platoon) {
                const matchesPlatoon =
                    item.oc.platoonId?.toLowerCase() === platoon ||
                    item.oc.platoonKey?.toLowerCase() === platoon ||
                    item.oc.platoonName?.toLowerCase().includes(platoon);
                if (!matchesPlatoon) return false;
            }
            return true;
        }),
    };
}

export function PTBulkManagePageContent() {
    const searchParams = useSearchParams();
    const [filters, setFilters] = useState<PTBulkFiltersType>({
        courseId: '',
        semester: null,
        active: true,
        q: '',
        platoon: '',
    });
    const [activeTab, setActiveTab] = useState<'scores' | 'motivation'>('scores');
    const [selectedTypeCode, setSelectedTypeCode] = useState('');
    const [workflowState, setWorkflowState] = useState<PtWorkflowStateResponse | null>(null);
    const [workflowLoading, setWorkflowLoading] = useState(false);
    const [workflowError, setWorkflowError] = useState<string | null>(null);
    const [workflowMessage, setWorkflowMessage] = useState('');

    const [scoreDraftValues, setScoreDraftValues] = useState<PTScoreDraftValues>({});
    const [motivationDraftValues, setMotivationDraftValues] = useState<Record<string, Record<string, string>>>({});
    const [clearScoreIds, setClearScoreIds] = useState<Record<string, string[]>>({});
    const [clearMotivationFieldIds, setClearMotivationFieldIds] = useState<Record<string, string[]>>({});
    const [saveSummary, setSaveSummary] = useState<PTBulkSaveResponse | null>(null);

    const { coursesQuery, platoonsQuery, bulkQuery, saveMutation } = usePhysicalTrainingBulk(filters);

    const workflowEnabled = workflowState?.settings.isActive ?? false;
    const allowedActions = useMemo(
        () => new Set(workflowState?.allowedActions ?? []),
        [workflowState?.allowedActions],
    );
    const canSaveDraft = allowedActions.has('SAVE_DRAFT');
    const canSubmit = allowedActions.has('SUBMIT_FOR_VERIFICATION');
    const canRequestChanges = allowedActions.has('REQUEST_CHANGES');
    const canVerify = allowedActions.has('VERIFY_AND_PUBLISH');
    const canOverride = allowedActions.has('OVERRIDE_PUBLISH');
    const canEditWorkflow = canSaveDraft || canOverride;
    const workflowStatus = workflowState?.ticket.status ?? 'DRAFT';
    const hasDraftChanges =
        Object.keys(scoreDraftValues).length > 0 ||
        Object.keys(motivationDraftValues).length > 0 ||
        Object.keys(clearScoreIds).length > 0 ||
        Object.keys(clearMotivationFieldIds).length > 0;

    useEffect(() => {
        const nextCourseId = searchParams.get('courseId') ?? '';
        const nextSemesterRaw = searchParams.get('semester');
        const nextSemester = nextSemesterRaw ? Number(nextSemesterRaw) : null;
        setFilters((prev) => ({
            ...prev,
            courseId: nextCourseId,
            semester: nextSemester && Number.isFinite(nextSemester) ? nextSemester : null,
        }));
    }, [searchParams]);

    useEffect(() => {
        const loadWorkflowState = async () => {
            if (!filters.courseId || !filters.semester) {
                setWorkflowState(null);
                setWorkflowError(null);
                return;
            }

            setWorkflowLoading(true);
            setWorkflowError(null);
            try {
                const response = await marksWorkflowApi.getPtWorkflowState({
                    courseId: filters.courseId,
                    semester: filters.semester,
                });
                setWorkflowState(response);
            } catch (error) {
                setWorkflowError(error instanceof Error ? error.message : 'Failed to load PT workflow state.');
            } finally {
                setWorkflowLoading(false);
            }
        };

        loadWorkflowState();
    }, [filters.courseId, filters.semester]);

    const effectiveWorkflowPayload = useMemo(() => {
        if (!workflowState) return null;
        return applyWorkflowDraftMutations({
            basePayload: workflowState.draftPayload,
            scoreDraftValues,
            motivationDraftValues,
            clearScoreIds,
            clearMotivationFieldIds,
        });
    }, [workflowState, scoreDraftValues, motivationDraftValues, clearScoreIds, clearMotivationFieldIds]);

    const displayWorkflowPayload = useMemo(() => {
        if (!effectiveWorkflowPayload) return null;
        return filterWorkflowItems(effectiveWorkflowPayload, filters);
    }, [effectiveWorkflowPayload, filters]);

    const displayData = workflowEnabled
        ? displayWorkflowPayload
        : bulkQuery.data
            ? {
                template: bulkQuery.data.template,
                items: bulkQuery.data.items,
            }
            : null;

    useEffect(() => {
        if (!displayData?.template?.types?.length) {
            setSelectedTypeCode('');
            return;
        }
        setSelectedTypeCode((prev) => {
            if (!prev) return displayData.template.types[0].code;
            const exists = displayData.template.types.some((type: { code: string }) => type.code === prev);
            return exists ? prev : displayData.template.types[0].code;
        });
    }, [displayData]);

    useEffect(() => {
        setScoreDraftValues({});
        setMotivationDraftValues({});
        setClearScoreIds({});
        setClearMotivationFieldIds({});
        setSaveSummary(null);
        setWorkflowMessage('');
    }, [filters.courseId, filters.semester]);

    const handleLegacySave = async () => {
        const data = bulkQuery.data;
        if (!data) {
            toast.error('Load data first.');
            return;
        }

        for (const [ocId, scoreMap] of Object.entries(scoreDraftValues)) {
            for (const draft of Object.values(scoreMap)) {
                const trimmed = draft.marks.trim();
                if (!trimmed) continue;
                const numeric = Number(trimmed);
                if (!Number.isFinite(numeric) || numeric < 0) {
                    toast.error(`Invalid score for ${ocId}. Use non-negative numbers only.`);
                    return;
                }
                if (numeric > draft.maxMarks) {
                    toast.error(`Marks cannot exceed ${draft.maxMarks}.`);
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
            setScoreDraftValues({});
            setMotivationDraftValues({});
            setClearScoreIds({});
            setClearMotivationFieldIds({});
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to save PT bulk updates.';
            toast.error(msg);
        }
    };

    const saveWorkflowDraft = async (options?: { message?: string; silent?: boolean }) => {
        if (!workflowState || !effectiveWorkflowPayload) {
            throw new Error('Workflow data is not loaded.');
        }

        const result = await marksWorkflowApi.applyPtWorkflowAction(
            { courseId: filters.courseId, semester: filters.semester! },
            {
                action: 'SAVE_DRAFT',
                revision: workflowState.currentRevision ?? null,
                payload: effectiveWorkflowPayload,
                message: options?.message,
            },
        );

        setWorkflowState(result);
        setScoreDraftValues({});
        setMotivationDraftValues({});
        setClearScoreIds({});
        setClearMotivationFieldIds({});
        if (!options?.silent) toast.success('Draft saved successfully.');
        return result;
    };

    const runWorkflowAction = async (
        action: 'SUBMIT_FOR_VERIFICATION' | 'REQUEST_CHANGES' | 'VERIFY_AND_PUBLISH' | 'OVERRIDE_PUBLISH',
    ) => {
        if (!workflowState || !filters.courseId || !filters.semester) return;

        try {
            const trimmedMessage = workflowMessage.trim();
            let state = workflowState;

            if (action === 'OVERRIDE_PUBLISH') {
                if (!trimmedMessage) {
                    throw new Error('A message is required for override publish.');
                }
                if (!effectiveWorkflowPayload) {
                    throw new Error('Workflow payload is not ready.');
                }
                state = await marksWorkflowApi.applyPtWorkflowAction(
                    { courseId: filters.courseId, semester: filters.semester },
                    {
                        action: 'OVERRIDE_PUBLISH',
                        revision: workflowState.currentRevision ?? 0,
                        payload: effectiveWorkflowPayload,
                        message: trimmedMessage,
                    },
                );
                setWorkflowState(state);
                setScoreDraftValues({});
                setMotivationDraftValues({});
                setClearScoreIds({});
                setClearMotivationFieldIds({});
                setWorkflowMessage('');
                toast.success('Verified PT data overridden successfully.');
                return;
            }

            if (hasDraftChanges && canSaveDraft) {
                if (workflowStatus === 'PENDING_VERIFICATION' && !trimmedMessage) {
                    throw new Error('Verifier draft saves require a message.');
                }
                state = await saveWorkflowDraft({ message: trimmedMessage || undefined, silent: true });
            }

            if (action === 'SUBMIT_FOR_VERIFICATION') {
                state = await marksWorkflowApi.applyPtWorkflowAction(
                    { courseId: filters.courseId, semester: filters.semester },
                    {
                        action,
                        revision: state.currentRevision ?? 1,
                    },
                );
                toast.success('Draft submitted for verification.');
            }

            if (action === 'REQUEST_CHANGES') {
                if (!trimmedMessage) {
                    throw new Error('A message is required to request changes.');
                }
                state = await marksWorkflowApi.applyPtWorkflowAction(
                    { courseId: filters.courseId, semester: filters.semester },
                    {
                        action,
                        revision: state.currentRevision ?? 1,
                        message: trimmedMessage,
                    },
                );
                toast.success('Changes requested.');
            }

            if (action === 'VERIFY_AND_PUBLISH') {
                state = await marksWorkflowApi.applyPtWorkflowAction(
                    { courseId: filters.courseId, semester: filters.semester },
                    {
                        action,
                        revision: state.currentRevision ?? 1,
                        message: trimmedMessage || undefined,
                    },
                );
                toast.success('Draft verified and published.');
            }

            setWorkflowState(state);
            setWorkflowMessage('');
            setScoreDraftValues({});
            setMotivationDraftValues({});
            setClearScoreIds({});
            setClearMotivationFieldIds({});
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Workflow action failed.');
        }
    };

    const handlePrimarySave = async () => {
        if (workflowEnabled) {
            try {
                const trimmedMessage = workflowMessage.trim();
                if (workflowStatus === 'PENDING_VERIFICATION' && !trimmedMessage) {
                    throw new Error('Verifier draft saves require a message.');
                }
                await saveWorkflowDraft({ message: trimmedMessage || undefined });
                setWorkflowMessage('');
            } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Failed to save workflow draft.');
            }
            return;
        }

        await handleLegacySave();
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
                    {workflowEnabled && workflowState ? (
                        <div className="rounded-lg border bg-card p-4 space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <Badge variant={getStatusTone(workflowStatus)}>{workflowStatus.replaceAll('_', ' ')}</Badge>
                                <span className="text-sm text-muted-foreground">{workflowState.selectionLabel}</span>
                                <span className="text-xs text-muted-foreground">
                                    Verified: {workflowStatus === 'VERIFIED' ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                PT marks and motivation values become live only after verifier publication.
                            </p>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Workflow Message</label>
                                <Textarea
                                    value={workflowMessage}
                                    onChange={(e) => setWorkflowMessage(e.target.value)}
                                    placeholder="Add a message for verifier edits, change requests, or overrides."
                                />
                            </div>
                        </div>
                    ) : null}

                    {workflowLoading ? (
                        <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading PT workflow...</div>
                    ) : workflowError ? (
                        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                            {workflowError}
                        </div>
                    ) : !workflowEnabled && bulkQuery.isLoading ? (
                        <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading PT records...</div>
                    ) : !workflowEnabled && bulkQuery.error ? (
                        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                            {(bulkQuery.error as Error).message}
                        </div>
                    ) : displayData ? (
                        <>
                            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'scores' | 'motivation')}>
                                <TabsList>
                                    <TabsTrigger value="scores">Scores</TabsTrigger>
                                    <TabsTrigger value="motivation">Motivation</TabsTrigger>
                                </TabsList>
                                <TabsContent value="scores" className="mt-4">
                                    <PTBulkScoresTable
                                        template={displayData.template}
                                        items={displayData.items as any}
                                        disabled={workflowEnabled ? !canEditWorkflow : false}
                                        selectedTypeCode={selectedTypeCode}
                                        onSelectedTypeCodeChange={setSelectedTypeCode}
                                        scoreDraftValues={scoreDraftValues}
                                        clearScoreIds={clearScoreIds}
                                        onTaskSelectionChange={(ocId, taskId, selection) => {
                                            setScoreDraftValues((prev) => ({
                                                ...prev,
                                                [ocId]: {
                                                    ...(prev[ocId] ?? {}),
                                                    [taskId]: selection,
                                                },
                                            }));
                                            setClearScoreIds((prev) => removeFromClearRecord(prev, ocId, taskId));
                                        }}
                                        onToggleClearScore={(ocId, taskId) => {
                                            setClearScoreIds((prev) => {
                                                const current = new Set(prev[ocId] ?? []);
                                                if (current.has(taskId)) current.delete(taskId);
                                                else current.add(taskId);
                                                return { ...prev, [ocId]: Array.from(current) };
                                            });
                                            setScoreDraftValues((prev) => {
                                                if (!prev[ocId]?.[taskId]) return prev;
                                                const next = { ...prev };
                                                next[ocId] = { ...(next[ocId] ?? {}) };
                                                delete next[ocId][taskId];
                                                return next;
                                            });
                                        }}
                                    />
                                </TabsContent>
                                <TabsContent value="motivation" className="mt-4">
                                    <PTBulkMotivationTable
                                        template={displayData.template}
                                        items={displayData.items as any}
                                        disabled={workflowEnabled ? !canEditWorkflow : false}
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
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setScoreDraftValues({});
                                        setMotivationDraftValues({});
                                        setClearScoreIds({});
                                        setClearMotivationFieldIds({});
                                    }}
                                    disabled={!hasDraftChanges}
                                >
                                    Reset Draft
                                </Button>

                                {workflowEnabled ? (
                                    <>
                                        {canSaveDraft && (
                                            <Button type="button" onClick={handlePrimarySave} disabled={!hasDraftChanges}>
                                                Save Draft
                                            </Button>
                                        )}
                                        {canSubmit ? (
                                            <Button type="button" variant="secondary" onClick={() => runWorkflowAction('SUBMIT_FOR_VERIFICATION')}>
                                                Submit For Verification
                                            </Button>
                                        ) : null}
                                        {canRequestChanges ? (
                                            <Button type="button" variant="outline" onClick={() => runWorkflowAction('REQUEST_CHANGES')}>
                                                Request Changes
                                            </Button>
                                        ) : null}
                                        {canVerify ? (
                                            <Button type="button" onClick={() => runWorkflowAction('VERIFY_AND_PUBLISH')}>
                                                Verify And Publish
                                            </Button>
                                        ) : null}
                                        {canOverride ? (
                                            <Button type="button" variant="destructive" onClick={() => runWorkflowAction('OVERRIDE_PUBLISH')}>
                                                Override Publish
                                            </Button>
                                        ) : null}
                                    </>
                                ) : (
                                    <Button onClick={handlePrimarySave} disabled={saveMutation.isPending}>
                                        {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                )}
                            </div>

                            {!workflowEnabled ? <PTBulkSaveSummary result={saveSummary} /> : null}
                        </>
                    ) : null}

                    {workflowEnabled && workflowState?.activityLog.length ? (
                        <div className="rounded-lg border bg-card p-4 space-y-3">
                            <h3 className="text-sm font-semibold">Activity Log</h3>
                            <div className="space-y-2">
                                {workflowState.activityLog.slice().reverse().map((event) => (
                                    <div key={event.id} className="rounded-md border px-3 py-2 text-sm">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="outline">{event.eventType.replaceAll('_', ' ')}</Badge>
                                            <span className="font-medium">
                                                {event.actor ? `${event.actor.rank} ${event.actor.name}`.trim() : 'System'}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(event.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        {event.message ? <p className="mt-1 text-muted-foreground">{event.message}</p> : null}
                                    </div>
                                ))}
                            </div>
                        </div>
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
