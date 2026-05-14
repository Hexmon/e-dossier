// hooks/useOCUpload.ts
"use client";

import { useCallback, useState } from "react";
import { bulkUploadOCs, bulkValidateOCs, type BulkUploadResult  } from "@/app/lib/api/ocApi";
import type { RawRow, UploadedPreviewRow } from "@/components/oc/UploadButton";
import { toDisplayDMY } from "@/app/lib/dateUtils";

export type BulkResult =
    | {
        success: number;
        failed: number;
        errors: Array<{ row: number; error: string }>;
    }
    | null;

type NonNullBulkResult = NonNullable<BulkResult>;

export function useOCUpload() {
    const [parsing, setParsing] = useState<boolean>(false);
    const [uploadedRawRows, setUploadedRawRows] = useState<RawRow[]>([]);
    const [uploadedPreview, setUploadedPreview] = useState<UploadedPreviewRow[]>([]);
    const [previewSession, setPreviewSession] = useState<number>(0);
    const [bulkUploading, setBulkUploading] = useState<boolean>(false);
    const [bulkResult, setBulkResult] = useState<BulkResult>(null);
    const [validateResult, setValidateResult] = useState<BulkResult>(null);
    const [rowValidations, setRowValidations] = useState<Record<number, string | "ok">>({});

    const onParsed = useCallback((raw: RawRow[], preview: UploadedPreviewRow[]) => {
        setUploadedRawRows(raw);
        setUploadedPreview(preview);
        setPreviewSession((prev) => prev + 1);
        setBulkResult(null);
        setValidateResult(null);
        setRowValidations({});
    }, []);

    const norm = useCallback((value: string) => {
        return value
            .toLowerCase()
            .replace(/['`’]/g, "'")
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }, []);

    const setRawValue = useCallback(
        (row: RawRow, aliases: string[], value: string) => {
            const out: RawRow = { ...row };
            const byNorm = new Map<string, string>();
            Object.keys(out).forEach((key) => byNorm.set(norm(key), key));
            for (const alias of aliases) {
                const key = byNorm.get(norm(alias));
                if (key) {
                    out[key] = value;
                    return out;
                }
            }
            out[aliases[0] ?? "value"] = value;
            return out;
        },
        [norm]
    );

    const pickRawValue = useCallback(
        (row: RawRow, aliases: string[]): unknown => {
            const valuesByHeader = new Map<string, unknown>();
            Object.keys(row).forEach((key) => valuesByHeader.set(norm(key), row[key]));

            for (const alias of aliases) {
                const value = valuesByHeader.get(norm(alias));
                if (value !== undefined && value !== null && String(value).trim() !== "") {
                    return value;
                }
            }

            return undefined;
        },
        [norm]
    );

    const toPreviewRow = useCallback(
        (row: RawRow): UploadedPreviewRow => {
            const arrivalRaw = pickRawValue(row, ["Dt of Arrival", "Date of Arrival", "DOA"]);
            return {
                name: String(pickRawValue(row, ["Name"]) ?? ""),
                tesNo: String(pickRawValue(row, ["Tes No", "TesNo", "TES NO", "OC No", "OC Number"]) ?? ""),
                course: String(pickRawValue(row, ["Course", "Course Code", "Course Name"]) ?? ""),
                branch: (pickRawValue(row, ["Branch"]) as string | null | undefined) ?? null,
                platoon: (pickRawValue(row, ["Platoon", "PlatoonId", "Platoon Id", "PL", "Pl"]) as string | null | undefined) ?? null,
                arrival: toDisplayDMY(arrivalRaw),
            };
        },
        [pickRawValue]
    );

    const updateUploadedRow = useCallback(
        (index: number, patch: Partial<UploadedPreviewRow>) => {
            setUploadedPreview((prev) =>
                prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
            );
            setUploadedRawRows((prev) =>
                prev.map((row, i) => {
                    if (i !== index) return row;
                    let next = { ...row };
                    if (patch.name !== undefined) {
                        next = setRawValue(next, ["Name"], patch.name);
                    }
                    if (patch.tesNo !== undefined) {
                        next = setRawValue(next, ["Tes No", "TesNo", "TES NO", "OC No", "OC Number"], patch.tesNo);
                    }
                    if (patch.course !== undefined) {
                        next = setRawValue(next, ["Course", "Course Code", "Course Name"], patch.course);
                    }
                    if (patch.branch !== undefined) {
                        next = setRawValue(next, ["Branch"], patch.branch ?? "");
                    }
                    if (patch.platoon !== undefined) {
                        next = setRawValue(next, ["Platoon", "PlatoonId", "Platoon Id", "PL", "Pl"], patch.platoon ?? "");
                    }
                    if (patch.arrival !== undefined) {
                        next = setRawValue(next, ["Dt of Arrival", "Date of Arrival", "DOA"], patch.arrival);
                    }
                    return next;
                })
            );
            setBulkResult(null);
            setValidateResult(null);
            setRowValidations({});
        },
        [setRawValue]
    );

    const updateUploadedRawRow = useCallback(
        (index: number, nextRawRow: RawRow) => {
            setUploadedRawRows((prev) =>
                prev.map((row, i) => (i === index ? { ...row, ...nextRawRow } : row))
            );
            setUploadedPreview((prev) =>
                prev.map((row, i) => (i === index ? toPreviewRow(nextRawRow) : row))
            );
            setBulkResult(null);
            setValidateResult(null);
            setRowValidations({});
        },
        [toPreviewRow]
    );

    const deleteUploadedRow = useCallback((index: number) => {
        setUploadedPreview((prev) => prev.filter((_, i) => i !== index));
        setUploadedRawRows((prev) => prev.filter((_, i) => i !== index));
        setBulkResult(null);
        setValidateResult(null);
        setRowValidations({});
    }, []);

    const doBulkUploadSelected = useCallback(
        async (
            selectedIndexes: number[],
            onComplete?: (result: NonNullBulkResult) => Promise<void>
        ): Promise<NonNullBulkResult | null> => {
            const uniqueIndexes = Array.from(
                new Set(
                    selectedIndexes
                        .filter((idx) => Number.isInteger(idx))
                        .map((idx) => Math.trunc(idx))
                        .filter((idx) => idx >= 0 && idx < uploadedRawRows.length)
                )
            ).sort((a, b) => a - b);

            if (uniqueIndexes.length === 0) return null;

            const selectedRows = uniqueIndexes.map((idx) => uploadedRawRows[idx]).filter(Boolean) as RawRow[];
            if (selectedRows.length === 0) return null;

            setBulkUploading(true);
            try {
                const res = await bulkUploadOCs(selectedRows);
                setBulkResult(res);

                const failedWithinSelected = new Set(
                    (res.errors ?? [])
                        .map((error) => error.row - 1)
                        .filter((idx) => idx >= 0)
                );
                const failedOriginalIndexes = new Set(
                    uniqueIndexes.filter((_, selectedPos) => failedWithinSelected.has(selectedPos))
                );
                const selectedIndexSet = new Set(uniqueIndexes);

                setUploadedRawRows((prev) =>
                    prev.filter((_, idx) => !selectedIndexSet.has(idx) || failedOriginalIndexes.has(idx))
                );
                setUploadedPreview((prev) =>
                    prev.filter((_, idx) => !selectedIndexSet.has(idx) || failedOriginalIndexes.has(idx))
                );
                setRowValidations({});

                if (onComplete) await onComplete(res);
                return res;
            } catch (err: any) {
                const failureResult: NonNullBulkResult = {
                    success: 0,
                    failed: selectedRows.length,
                    errors: [{ row: 0, error: err?.message ?? "Upload failed" }],
                };
                setBulkResult(failureResult);
                return failureResult;
            } finally {
                setBulkUploading(false);
            }
        },
        [uploadedRawRows]
    );

    const doBulkUpload = useCallback(
        async (onComplete?: (result: NonNullBulkResult) => Promise<void>) => {
            if (uploadedRawRows.length === 0) return null;
            return doBulkUploadSelected(
                uploadedRawRows.map((_, idx) => idx),
                onComplete
            );
        },
        [uploadedRawRows, doBulkUploadSelected]
    );

    const doValidateAll = useCallback(async () => {
        if (uploadedRawRows.length === 0) return;
        try {
            const res: BulkUploadResult = await bulkValidateOCs(uploadedRawRows);
            setValidateResult(res);

            const map: Record<number, string | "ok"> = {};
            (res.errors ?? []).slice(0, 500).forEach((e) => {
                map[e.row - 1] = e.error;
            });
            uploadedRawRows.forEach((_, i) => {
                if (!(i in map)) map[i] = "ok";
            });
            setRowValidations(map);
        } catch (e) {
            console.error("validate failed", e);
        }
    }, [uploadedRawRows]);

    const doValidateRow = useCallback(
        async (rowIndex: number) => {
            const row = uploadedRawRows[rowIndex];
            if (!row) return;
            try {
                const res = await bulkValidateOCs([row]);
                setRowValidations((prev) => ({
                    ...prev,
                    [rowIndex]: res.failed > 0 ? res.errors[0]?.error ?? "error" : "ok",
                }));
            } catch (e: any) {
                setRowValidations((prev) => ({ ...prev, [rowIndex]: e?.message ?? "error" }));
            }
        },
        [uploadedRawRows]
    );

    const clear = useCallback(() => {
        setUploadedRawRows([]);
        setUploadedPreview([]);
        setBulkResult(null);
        setValidateResult(null);
        setRowValidations({});
    }, []);

    return {
        parsing,
        setParsing,
        uploadedRawRows,
        uploadedPreview,
        previewSession,
        onParsed,
        bulkUploading,
        bulkResult,
        validateResult,
        rowValidations,
        doBulkUpload,
        doBulkUploadSelected,
        doValidateAll,
        doValidateRow,
        updateUploadedRow,
        updateUploadedRawRow,
        deleteUploadedRow,
        clear,
    };
}
