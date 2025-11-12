"use client";

import { Button } from "@/components/ui/button";
import { UploadCloud, ShieldCheck, CircleCheck } from "lucide-react";
import type { UploadedPreviewRow } from "./UploadButton";

type BulkResult = {
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
} | null;

type Props = {
    rows: UploadedPreviewRow[];
    bulkUploading: boolean;
    bulkResult: BulkResult;
    onBulkUpload: () => void;
    onClear: () => void;

    // NEW: server-side validate (dry-run)
    onValidateAll?: () => void;
    validateResult?: BulkResult | null;

    // NEW: optional per-row validate
    onValidateRow?: (rowIndex: number) => void;
    rowValidations?: Record<number, string | "ok">; // error message or "ok"
};

export default function UploadPreviewTable({
    rows,
    bulkUploading,
    bulkResult,
    onBulkUpload,
    onClear,
    onValidateAll,
    validateResult,
    onValidateRow,
    rowValidations = {},
}: Props) {
    if (rows.length === 0) return null;

    return (
        <div className="rounded-md border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-3 bg-muted/40">
                <h3 className="font-semibold">Latest Upload (preview) — {rows.length} rows</h3>
                <div className="flex items-center gap-2">
                    {onValidateAll && (
                        <Button variant="outline" onClick={onValidateAll} className="gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            Validate (dry-run)
                        </Button>
                    )}
                    <Button onClick={onBulkUpload} disabled={bulkUploading} className="gap-2">
                        <UploadCloud className="h-4 w-4" />
                        {bulkUploading ? "Uploading…" : "Bulk upload to server"}
                    </Button>
                    <Button variant="outline" onClick={onClear}>
                        Clear preview
                    </Button>
                </div>
            </div>

            {/* validation summary */}
            {validateResult && (
                <div className="px-3 py-2 border-t border-border/50 text-sm">
                    <div className="flex gap-4">
                        <span className="text-emerald-600">Valid: {validateResult.success}</span>
                        <span className="text-destructive">Issues: {validateResult.failed}</span>
                    </div>
                    {validateResult.errors?.length > 0 && (
                        <ul className="list-disc ml-6 mt-2 text-muted-foreground">
                            {validateResult.errors.slice(0, 5).map((e, i) => (
                                <li key={i}>Row {e.row}: {e.error}</li>
                            ))}
                            {validateResult.errors.length > 5 && (
                                <li>…and {validateResult.errors.length - 5} more</li>
                            )}
                        </ul>
                    )}
                </div>
            )}

            {/* upload result */}
            {bulkResult && (
                <div className="px-3 py-2 border-t border-border/50 text-sm">
                    <div className="flex gap-4">
                        <span className="text-emerald-600">Success: {bulkResult.success}</span>
                        <span className="text-destructive">Failed: {bulkResult.failed}</span>
                    </div>
                    {bulkResult.errors?.length > 0 && (
                        <ul className="list-disc ml-6 mt-2 text-muted-foreground">
                            {bulkResult.errors.slice(0, 5).map((e, i) => (
                                <li key={i}>Row {e.row}: {e.error}</li>
                            ))}
                            {bulkResult.errors.length > 5 && (
                                <li>…and {bulkResult.errors.length - 5} more</li>
                            )}
                        </ul>
                    )}
                </div>
            )}

            <table className="min-w-full text-sm">
                <thead className="bg-muted/50">
                    <tr className="text-left">
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">TES No</th>
                        <th className="px-3 py-2">Course</th>
                        <th className="px-3 py-2">Branch</th>
                        <th className="px-3 py-2">Platoon</th>
                        <th className="px-3 py-2">Arrival</th>
                        <th className="px-3 py-2">Verify</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, idx) => {
                        const val = rowValidations[idx];
                        return (
                            <tr key={idx} className="border-t border-border/50">
                                <td className="px-3 py-2">{r.name}</td>
                                <td className="px-3 py-2">{r.tesNo}</td>
                                <td className="px-3 py-2">{r.course ?? ""}</td>
                                <td className="px-3 py-2">{r.branch ?? ""}</td>
                                <td className="px-3 py-2">{r.platoon ?? ""}</td>
                                <td className="px-3 py-2">{r.arrival}</td>
                                <td className="px-3 py-2">
                                    {onValidateRow && (
                                        <Button variant="outline" size="sm" onClick={() => onValidateRow(idx)} className="gap-2">
                                            <ShieldCheck className="h-3 w-3" /> Check
                                        </Button>
                                    )}
                                    {val && (
                                        <span className={`ml-2 text-xs ${val === "ok" ? "text-emerald-600" : "text-destructive"}`}>
                                            {val === "ok" ? (<><CircleCheck className="inline h-3 w-3" /> OK</>) : val}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
