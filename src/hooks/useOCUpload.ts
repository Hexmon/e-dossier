// hooks/useOCUpload.ts
"use client";

import { useCallback, useState } from "react";
import { bulkUploadOCs, bulkValidateOCs, type BulkUploadResult  } from "@/app/lib/api/ocApi";
import type { RawRow, UploadedPreviewRow } from "@/components/oc/UploadButton";

export type BulkResult =
    | {
        success: number;
        failed: number;
        errors: Array<{ row: number; error: string }>;
    }
    | null;

export function useOCUpload() {
    const [parsing, setParsing] = useState<boolean>(false);
    const [uploadedRawRows, setUploadedRawRows] = useState<RawRow[]>([]);
    const [uploadedPreview, setUploadedPreview] = useState<UploadedPreviewRow[]>([]);
    const [bulkUploading, setBulkUploading] = useState<boolean>(false);
    const [bulkResult, setBulkResult] = useState<BulkResult>(null);
    const [validateResult, setValidateResult] = useState<BulkResult>(null);
    const [rowValidations, setRowValidations] = useState<Record<number, string | "ok">>({});

    const onParsed = useCallback((raw: RawRow[], preview: UploadedPreviewRow[]) => {
        setUploadedRawRows(raw);
        setUploadedPreview(preview);
        setBulkResult(null);
        setValidateResult(null);
        setRowValidations({});
    }, []);

    const doBulkUpload = useCallback(
        async (onComplete?: () => Promise<void>) => {
            if (uploadedRawRows.length === 0) return;
            setBulkUploading(true);
            try {
                const res = await bulkUploadOCs(uploadedRawRows);
                setBulkResult(res);
                if (onComplete) await onComplete();
            } catch (err: any) {
                setBulkResult({
                    success: 0,
                    failed: uploadedRawRows.length,
                    errors: [{ row: 0, error: err?.message ?? "Upload failed" }],
                });
            } finally {
                setBulkUploading(false);
            }
        },
        [uploadedRawRows]
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
        onParsed,
        bulkUploading,
        bulkResult,
        validateResult,
        rowValidations,
        doBulkUpload,
        doValidateAll,
        doValidateRow,
        clear,
    };
}