'use client';

import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import type { PTTemplate } from '@/app/lib/api/Physicaltrainingapi';
import type { PTBulkGetItem } from '@/app/lib/api/physicalTrainingBulkApi';

type Props = {
    template: PTTemplate;
    items: PTBulkGetItem[];
    selectedTypeCode: string;
    onSelectedTypeCodeChange: (value: string) => void;
    scoreDraftValues: Record<string, Record<string, string>>;
    clearScoreIds: Record<string, string[]>;
    onScoreChange: (ocId: string, ptTaskScoreId: string, value: string) => void;
    onToggleClearScore: (ocId: string, ptTaskScoreId: string) => void;
};

type ScoreSlot = {
    ptTaskScoreId: string;
    taskTitle: string;
    attemptCode: string;
    gradeCode: string;
    maxMarks: number;
};

export function PTBulkScoresTable({
    template,
    items,
    selectedTypeCode,
    onSelectedTypeCodeChange,
    scoreDraftValues,
    clearScoreIds,
    onScoreChange,
    onToggleClearScore,
}: Props) {
    const selectedType = useMemo(() => {
        return template.types.find((type) => type.code === selectedTypeCode) ?? template.types[0] ?? null;
    }, [template.types, selectedTypeCode]);

    const scoreSlots = useMemo<ScoreSlot[]>(() => {
        if (!selectedType) return [];
        const slots: ScoreSlot[] = [];
        for (const task of selectedType.tasks ?? []) {
            for (const attempt of task.attempts ?? []) {
                for (const grade of attempt.grades ?? []) {
                    if (!grade.scoreId) continue;
                    slots.push({
                        ptTaskScoreId: grade.scoreId,
                        taskTitle: task.title,
                        attemptCode: attempt.code,
                        gradeCode: grade.code,
                        maxMarks: typeof grade.maxMarks === 'number' ? grade.maxMarks : task.maxMarks,
                    });
                }
            }
        }
        return slots;
    }, [selectedType]);

    const initialScoreByOc = useMemo(() => {
        const map = new Map<string, number>();
        for (const item of items) {
            for (const score of item.scores) {
                map.set(`${item.oc.id}:${score.ptTaskScoreId}`, score.marksScored);
            }
        }
        return map;
    }, [items]);

    if (!selectedType) {
        return <div className="rounded-md border p-4 text-sm text-muted-foreground">No PT template found.</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <span className="text-sm font-medium">PT Type</span>
                <select
                    className="rounded-md border px-3 py-2 text-sm"
                    value={selectedType.code}
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
                            {scoreSlots.map((slot) => (
                                <th key={slot.ptTaskScoreId} className="min-w-44 border px-2 py-2 text-left align-top">
                                    <div className="font-medium">{slot.taskTitle}</div>
                                    <div className="text-xs text-muted-foreground">{slot.attemptCode} / {slot.gradeCode}</div>
                                    <div className="text-xs text-muted-foreground">Max: {slot.maxMarks}</div>
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
                                {scoreSlots.map((slot) => {
                                    const key = `${item.oc.id}:${slot.ptTaskScoreId}`;
                                    const isCleared = (clearScoreIds[item.oc.id] ?? []).includes(slot.ptTaskScoreId);
                                    const draft = scoreDraftValues[item.oc.id]?.[slot.ptTaskScoreId];
                                    const initial = initialScoreByOc.get(key);
                                    const value = draft ?? (isCleared ? '' : initial !== undefined ? String(initial) : '');
                                    const showClear = isCleared || initial !== undefined;

                                    return (
                                        <td key={slot.ptTaskScoreId} className="border px-2 py-2 align-top">
                                            <div className="space-y-1">
                                                <Input
                                                    value={value}
                                                    onChange={(e) => onScoreChange(item.oc.id, slot.ptTaskScoreId, e.target.value)}
                                                    inputMode="numeric"
                                                    placeholder="-"
                                                    className="h-8"
                                                />
                                                {showClear ? (
                                                    <button
                                                        type="button"
                                                        className="text-xs text-primary underline"
                                                        onClick={() => onToggleClearScore(item.oc.id, slot.ptTaskScoreId)}
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
