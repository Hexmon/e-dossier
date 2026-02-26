'use client';

import type { PTBulkSaveResponse } from '@/app/lib/api/physicalTrainingBulkApi';

type Props = {
    result: PTBulkSaveResponse | null;
};

export function PTBulkSaveSummary({ result }: Props) {
    if (!result) return null;

    return (
        <div className="space-y-3 rounded-md border p-4">
            <div className="text-sm font-medium">Last save summary</div>
            <div className="text-sm text-muted-foreground">
                Success: {result.successCount} | Failed: {result.errorCount}
            </div>
            <div className="space-y-2">
                {result.items.map((item) => (
                    <div
                        key={`${item.index}-${item.ocId}`}
                        className={`rounded-md border px-3 py-2 text-sm ${
                            item.status === 'ok'
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                                : 'border-destructive/40 bg-destructive/10 text-destructive'
                        }`}
                    >
                        <div className="font-medium">OC: {item.ocId}</div>
                        {item.status === 'ok' ? (
                            <div>
                                Scores saved: {item.scoreUpserts}, Scores cleared: {item.scoreClears}, Motivation saved:{' '}
                                {item.motivationUpserts}, Motivation cleared: {item.motivationClears}
                            </div>
                        ) : (
                            <div>
                                {item.error?.message}
                                {item.error?.code ? ` (${item.error.code})` : ''}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
