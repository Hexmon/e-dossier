'use client';

import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import type { PTTemplate } from '@/app/lib/api/Physicaltrainingapi';
import type { PTBulkGetItem } from '@/app/lib/api/physicalTrainingBulkApi';
import {
    buildPTBulkInitialSelections,
    buildPTBulkTaskDefinitions,
    createPTBulkTaskSelection,
    getDefaultPTBulkTaskSelection,
    type PTBulkTaskSelection,
} from '@/components/physic-training/bulk/ptBulkScoreHelpers';

type Props = {
    template: PTTemplate;
    items: PTBulkGetItem[];
    disabled?: boolean;
    selectedTypeCode: string;
    onSelectedTypeCodeChange: (value: string) => void;
    scoreDraftValues: Record<string, Record<string, PTBulkTaskSelection>>;
    clearScoreIds: Record<string, string[]>;
    onTaskSelectionChange: (ocId: string, taskId: string, selection: PTBulkTaskSelection) => void;
    onToggleClearScore: (ocId: string, taskId: string) => void;
};

export function PTBulkScoresTable({
    template,
    items,
    disabled = false,
    selectedTypeCode,
    onSelectedTypeCodeChange,
    scoreDraftValues,
    clearScoreIds,
    onTaskSelectionChange,
    onToggleClearScore,
}: Props) {
    const selectedType = useMemo(() => {
        return template.types.find((type) => type.code === selectedTypeCode) ?? template.types[0] ?? null;
    }, [template.types, selectedTypeCode]);

    const taskDefinitions = useMemo(() => {
        return buildPTBulkTaskDefinitions(selectedType);
    }, [selectedType]);

    const initialSelections = useMemo(() => {
        return buildPTBulkInitialSelections(items, taskDefinitions);
    }, [items, taskDefinitions]);

    if (!selectedType) {
        return <div className="rounded-md border p-4 text-sm text-muted-foreground">No PT template found.</div>;
    }

    if (!taskDefinitions.length) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">PT Type</span>
                    <select
                        className="rounded-md border px-3 py-2 text-sm"
                        value={selectedType.code}
                        disabled={disabled}
                        onChange={(e) => onSelectedTypeCodeChange(e.target.value)}
                    >
                        {template.types.map((type) => (
                            <option key={type.id} value={type.code}>
                                {type.title}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="rounded-md border p-4 text-sm text-muted-foreground">
                    No score-bearing tasks are configured for this PT type.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <span className="text-sm font-medium">PT Type</span>
                <select
                    className="rounded-md border px-3 py-2 text-sm"
                    value={selectedType.code}
                    disabled={disabled}
                    onChange={(e) => onSelectedTypeCodeChange(e.target.value)}
                >
                    {template.types.map((type) => (
                        <option key={type.id} value={type.code}>
                            {type.title}
                        </option>
                    ))}
                </select>
            </div>

            <div className="overflow-auto rounded-md border">
                <table className="min-w-full border-collapse text-sm">
                    <thead>
                        <tr className="bg-muted/40">
                            <th className="sticky left-0 z-10 border bg-muted/40 px-3 py-2 text-left">OC</th>
                            {taskDefinitions.map((task) => (
                                <th key={task.taskId} className="min-w-64 border px-2 py-2 text-left align-top">
                                    <div className="font-medium">{task.taskTitle}</div>
                                    <div className="text-xs text-muted-foreground">Choose category, status, and marks</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.oc.id}>
                                <td className="sticky left-0 z-10 border bg-background px-3 py-2 align-top">
                                    <div className="font-medium">{item.oc.name}</div>
                                    <div className="text-xs text-muted-foreground">{item.oc.ocNo}</div>
                                </td>
                                {taskDefinitions.map((task) => {
                                    const initialSelection = initialSelections[item.oc.id]?.[task.taskId];
                                    const draftSelection = scoreDraftValues[item.oc.id]?.[task.taskId];
                                    const isCleared = (clearScoreIds[item.oc.id] ?? []).includes(task.taskId);
                                    const fallbackSelection = getDefaultPTBulkTaskSelection(task);
                                    const selection = isCleared
                                        ? null
                                        : draftSelection ?? initialSelection ?? fallbackSelection;
                                    const showClear = Boolean(initialSelection || draftSelection || isCleared);

                                    return (
                                        <td key={task.taskId} className="border px-2 py-2 align-top">
                                            <div className="space-y-2">
                                                <select
                                                    className="h-8 w-full rounded-md border px-2 text-xs disabled:cursor-not-allowed disabled:bg-muted/60"
                                                    value={selection?.selectedAttemptCode ?? ''}
                                                    disabled={disabled || isCleared || !selection}
                                                    onChange={(e) => {
                                                        const nextAttempt = task.attempts.find(
                                                            (attempt) => attempt.attemptCode === e.target.value,
                                                        );
                                                        const nextGrade = nextAttempt?.grades[0];
                                                        if (!nextAttempt || !nextGrade) return;

                                                        const nextSelection = createPTBulkTaskSelection(
                                                            task,
                                                            nextAttempt.attemptCode,
                                                            nextGrade.gradeCode,
                                                            initialSelection?.selectedScoreId === nextGrade.scoreId
                                                                ? initialSelection.marks
                                                                : undefined,
                                                        );
                                                        if (!nextSelection) return;
                                                        onTaskSelectionChange(item.oc.id, task.taskId, nextSelection);
                                                    }}
                                                >
                                                    {task.attempts.map((attempt) => (
                                                        <option key={`${task.taskId}-${attempt.attemptCode}`} value={attempt.attemptCode}>
                                                            Category: {attempt.attemptCode}
                                                        </option>
                                                    ))}
                                                </select>

                                                <select
                                                    className="h-8 w-full rounded-md border px-2 text-xs disabled:cursor-not-allowed disabled:bg-muted/60"
                                                    value={selection?.selectedGradeCode ?? ''}
                                                    disabled={disabled || isCleared || !selection}
                                                    onChange={(e) => {
                                                        if (!selection) return;
                                                        const nextSelection = createPTBulkTaskSelection(
                                                            task,
                                                            selection.selectedAttemptCode,
                                                            e.target.value,
                                                            initialSelection?.selectedScoreId === selection.selectedScoreId
                                                                ? initialSelection.marks
                                                                : undefined,
                                                        );
                                                        if (!nextSelection) return;
                                                        onTaskSelectionChange(item.oc.id, task.taskId, nextSelection);
                                                    }}
                                                >
                                                    {(task.attempts.find(
                                                        (attempt) => attempt.attemptCode === selection?.selectedAttemptCode,
                                                    )?.grades ?? []).map((grade) => (
                                                        <option
                                                            key={`${task.taskId}-${selection?.selectedAttemptCode}-${grade.gradeCode}`}
                                                            value={grade.gradeCode}
                                                        >
                                                            Status: {grade.gradeCode}
                                                        </option>
                                                    ))}
                                                </select>

                                                <Input
                                                    value={selection?.marks ?? ''}
                                                    onChange={(e) => {
                                                        if (!selection) return;
                                                        onTaskSelectionChange(item.oc.id, task.taskId, {
                                                            ...selection,
                                                            marks: e.target.value,
                                                        });
                                                    }}
                                                    inputMode="numeric"
                                                    placeholder="-"
                                                    className="h-8"
                                                    disabled={disabled || isCleared || !selection}
                                                />

                                                <div className="text-[11px] text-muted-foreground">
                                                    {selection ? `Max: ${selection.maxMarks}` : 'Selection cleared'}
                                                </div>

                                                {showClear ? (
                                                    <button
                                                        type="button"
                                                        className="text-xs text-primary underline"
                                                        onClick={() => onToggleClearScore(item.oc.id, task.taskId)}
                                                        disabled={disabled}
                                                    >
                                                        {isCleared ? 'Undo clear' : 'Clear'}
                                                    </button>
                                                ) : null}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
