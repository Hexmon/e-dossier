'use client';

import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import type { PTTemplate } from '@/app/lib/api/Physicaltrainingapi';
import type { PTBulkGetItem } from '@/app/lib/api/physicalTrainingBulkApi';

type Props = {
    template: PTTemplate;
    items: PTBulkGetItem[];
    motivationDraftValues: Record<string, Record<string, string>>;
    clearMotivationFieldIds: Record<string, string[]>;
    onMotivationChange: (ocId: string, fieldId: string, value: string) => void;
    onToggleClearMotivation: (ocId: string, fieldId: string) => void;
};

export function PTBulkMotivationTable({
    template,
    items,
    motivationDraftValues,
    clearMotivationFieldIds,
    onMotivationChange,
    onToggleClearMotivation,
}: Props) {
    const fields = useMemo(
        () => [...(template.motivationFields ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
        [template.motivationFields]
    );

    const initialByOcField = useMemo(() => {
        const map = new Map<string, string>();
        for (const item of items) {
            for (const value of item.motivationValues) {
                map.set(`${item.oc.id}:${value.fieldId}`, value.value ?? '');
            }
        }
        return map;
    }, [items]);

    if (!fields.length) {
        return <div className="rounded-md border p-4 text-sm text-muted-foreground">No motivation fields for this semester.</div>;
    }

    return (
        <div className="overflow-auto rounded-md border">
            <table className="min-w-full border-collapse text-sm">
                <thead>
                    <tr className="bg-muted/40">
                        <th className="sticky left-0 z-10 border bg-muted/40 px-3 py-2 text-left">OC</th>
                        {fields.map((field) => (
                            <th key={field.id} className="min-w-56 border px-2 py-2 text-left align-top">
                                <div className="font-medium">{field.label}</div>
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
                            {fields.map((field) => {
                                const key = `${item.oc.id}:${field.id}`;
                                const isCleared = (clearMotivationFieldIds[item.oc.id] ?? []).includes(field.id);
                                const draft = motivationDraftValues[item.oc.id]?.[field.id];
                                const initial = initialByOcField.get(key);
                                const value = draft ?? (isCleared ? '' : initial ?? '');
                                const showClear = isCleared || Boolean(initial);

                                return (
                                    <td key={field.id} className="border px-2 py-2 align-top">
                                        <div className="space-y-1">
                                            <Input
                                                value={value}
                                                onChange={(e) => onMotivationChange(item.oc.id, field.id, e.target.value)}
                                                placeholder="Enter value"
                                            />
                                            {showClear ? (
                                                <button
                                                    type="button"
                                                    className="text-xs text-primary underline"
                                                    onClick={() => onToggleClearMotivation(item.oc.id, field.id)}
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
    );
}
