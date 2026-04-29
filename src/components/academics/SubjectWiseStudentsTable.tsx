"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TableColumn, TableConfig, UniversalTable } from "../layout/TableLayout";
import { BulkAcademicItem } from "@/app/lib/api/academicsMarksApi";
import { useAcademicsMarks } from "@/hooks/useAcademicsMarks";
import { computePracticalTotalMarks } from "@/app/lib/academic-marks-core";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import {
    buildBulkAcademicMarksTemplateRows,
    getBulkAcademicMarksTemplateColumns,
    importBulkAcademicMarksRows,
    type BulkAcademicMarksImportRow,
    type SheetRow,
} from "./bulkAcademicMarksImport";
import {
    marksWorkflowApi,
    type AcademicsWorkflowActionInput,
    type AcademicsWorkflowDraftPayload,
    type AcademicsWorkflowStateResponse,
    type WorkflowStatus,
} from "@/app/lib/api/marksWorkflowApi";

interface Props {
    courseId: string;
    semester: number;
    subjectId: string;
    subjectBranch: string | null;
    includeTheory: boolean;
    includePractical: boolean;
}

export type StudentRow = BulkAcademicMarksImportRow;

const practicalComponentKeys = ["contentOfExp", "maintOfExp", "practicalExam", "viva"] as const;
const standardMarksInputClassName =
    "h-9 min-w-[7.5rem] px-3 text-sm text-center font-medium lg:h-10 lg:text-base";
const wideMarksInputClassName =
    "h-9 min-w-[9rem] px-3 text-sm text-center font-medium lg:h-10 lg:text-base";
const readonlyMarksInputClassName = `${standardMarksInputClassName} bg-muted/50`;

function formatMarksInput(value: number | null | undefined): string {
    return value != null ? String(value) : "";
}

function hasPracticalBreakdown(row: Pick<StudentRow, typeof practicalComponentKeys[number]>): boolean {
    return practicalComponentKeys.some((key) => row[key].trim() !== "");
}

function derivePracticalTotal(row: Pick<StudentRow, typeof practicalComponentKeys[number]>): string {
    if (!hasPracticalBreakdown(row)) return "";
    return String(
        computePracticalTotalMarks({
            contentOfExpMarks: row.contentOfExp,
            maintOfExpMarks: row.maintOfExp,
            practicalMarks: row.practicalExam,
            vivaMarks: row.viva,
        }),
    );
}

function buildPracticalPayload(row: StudentRow) {
    const contentOfExpMarks = toOptionalNumber(row.contentOfExp);
    const maintOfExpMarks = toOptionalNumber(row.maintOfExp);
    const practicalMarks = toOptionalNumber(row.practicalExam);
    const vivaMarks = toOptionalNumber(row.viva);

    return {
        contentOfExpMarks,
        maintOfExpMarks,
        practicalMarks,
        vivaMarks,
        finalMarks: toOptionalNumber(row.practical),
    };
}

type SubjectComponentFlags = {
    includeTheory: boolean;
    includePractical: boolean;
};

function toNum(value: string): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

function toNullableNumber(value: string): number | null | undefined {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : null;
}

function toOptionalNumber(value: string): number | undefined {
    return toNullableNumber(value) ?? undefined;
}

function buildRowsFromWorkflowPayload(
    payload: AcademicsWorkflowDraftPayload,
    components: SubjectComponentFlags,
): StudentRow[] {
    return payload.items.map((item) => {
        const phase1 = components.includeTheory && item.theory?.phaseTest1Marks != null ? String(item.theory.phaseTest1Marks) : "";
        const phase2 = components.includeTheory && item.theory?.phaseTest2Marks != null ? String(item.theory.phaseTest2Marks) : "";
        const tutorial = components.includeTheory ? item.theory?.tutorial ?? "" : "";
        const final = components.includeTheory && item.theory?.finalMarks != null ? String(item.theory.finalMarks) : "";
        const contentOfExp = components.includePractical ? formatMarksInput(item.practical?.contentOfExpMarks) : "";
        const maintOfExp = components.includePractical ? formatMarksInput(item.practical?.maintOfExpMarks) : "";
        const practicalExam = components.includePractical ? formatMarksInput(item.practical?.practicalMarks) : "";
        const viva = components.includePractical ? formatMarksInput(item.practical?.vivaMarks) : "";
        const practicalBreakdownTotal = derivePracticalTotal({
            contentOfExp,
            maintOfExp,
            practicalExam,
            viva,
        });
        const practical = components.includePractical
            ? practicalBreakdownTotal || formatMarksInput(item.practical?.finalMarks)
            : "";
        const sessional = components.includeTheory ? toNum(phase1) + toNum(phase2) + toNum(tutorial) : 0;
        const total =
            sessional +
            (components.includeTheory ? toNum(final) : 0) +
            (components.includePractical ? toNum(practical) : 0);

        return {
            id: item.ocId,
            ocNo: item.ocNo,
            name: item.name,
            phase1,
            phase2,
            tutorial,
            sessional,
            final,
            contentOfExp,
            maintOfExp,
            practicalExam,
            viva,
            practical,
            total,
        };
    });
}

function buildWorkflowDraftPayload(
    basePayload: AcademicsWorkflowDraftPayload,
    rows: StudentRow[],
    components: SubjectComponentFlags,
): AcademicsWorkflowDraftPayload {
    return {
        ...basePayload,
        items: rows.map((row) => ({
            ocId: row.id,
            ocNo: row.ocNo,
            name: row.name,
            branch: basePayload.items.find((item) => item.ocId === row.id)?.branch ?? null,
            theory: components.includeTheory
                ? {
                    phaseTest1Marks: toNullableNumber(row.phase1),
                    phaseTest2Marks: toNullableNumber(row.phase2),
                    tutorial: row.tutorial.trim() || undefined,
                    finalMarks: toNullableNumber(row.final),
                }
                : undefined,
            practical: components.includePractical ? buildPracticalPayload(row) : undefined,
        })),
    };
}

function getStatusTone(status: WorkflowStatus): "default" | "secondary" | "outline" {
    if (status === "VERIFIED") return "default";
    if (status === "PENDING_VERIFICATION") return "secondary";
    return "outline";
}

export default function SubjectWiseStudentsTable({
    courseId,
    semester,
    subjectId,
    subjectBranch,
    includeTheory,
    includePractical,
}: Props) {
    const {
        allOCs,
        loadingOCs,
        getFilteredOCsByBranch,
        fetchBulkAcademics,
        saveBulkAcademics,
        error,
    } = useAcademicsMarks();

    const [rows, setRows] = useState<StudentRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [legacyEditMode, setLegacyEditMode] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [workflowState, setWorkflowState] = useState<AcademicsWorkflowStateResponse | null>(null);
    const [actionMessage, setActionMessage] = useState("");
    const [loadError, setLoadError] = useState<string | null>(null);
    const [templateOpen, setTemplateOpen] = useState(false);
    const [importing, setImporting] = useState(false);
    const importInputRef = useRef<HTMLInputElement | null>(null);

    const workflowEnabled = workflowState?.settings.isActive ?? false;
    const workflowStatus = workflowState?.ticket.status ?? "DRAFT";
    const subjectComponents = useMemo(
        () => ({ includeTheory, includePractical }),
        [includeTheory, includePractical],
    );
    const allowedActions = useMemo(
        () => new Set(workflowState?.allowedActions ?? []),
        [workflowState?.allowedActions],
    );
    const canSaveDraft = allowedActions.has("SAVE_DRAFT");
    const canSubmit = allowedActions.has("SUBMIT_FOR_VERIFICATION");
    const canRequestChanges = allowedActions.has("REQUEST_CHANGES");
    const canVerify = allowedActions.has("VERIFY_AND_PUBLISH");
    const canOverride = allowedActions.has("OVERRIDE_PUBLISH");
    const canEditWorkflow = canSaveDraft || canOverride;
    const inputsDisabled = workflowEnabled ? !canEditWorkflow : !legacyEditMode;
    const importDisabled = importing || loading || loadingOCs || rows.length === 0 || (workflowEnabled && !canEditWorkflow);
    const templateColumns = useMemo(
        () => getBulkAcademicMarksTemplateColumns(subjectComponents),
        [subjectComponents],
    );
    const templateRows = useMemo(
        () => buildBulkAcademicMarksTemplateRows(rows, subjectComponents),
        [rows, subjectComponents],
    );
    const templatePreviewRows = useMemo(() => templateRows.slice(0, 50), [templateRows]);

    useEffect(() => {
        let cancelled = false;

        const loadWorkflowState = async () => {
            if (!courseId || !semester || !subjectId) {
                if (cancelled) return;
                setRows([]);
                setWorkflowState(null);
                setLegacyEditMode(false);
                setIsDirty(false);
                setLoadError(null);
                return;
            }

            setLoading(true);
            setLoadError(null);

            try {
                const workflow = await marksWorkflowApi.getAcademicsWorkflowState({
                    courseId,
                    semester,
                    subjectId,
                });

                if (cancelled) return;

                setWorkflowState(workflow);
                setLegacyEditMode(false);
                setIsDirty(false);
                setActionMessage("");

                if (workflow.settings.isActive) {
                    setRows(buildRowsFromWorkflowPayload(workflow.draftPayload, subjectComponents));
                } else {
                    setRows([]);
                }
            } catch (err) {
                if (cancelled) return;
                const message = err instanceof Error ? err.message : "Failed to load academic workflow state.";
                setLoadError(message);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadWorkflowState();

        return () => {
            cancelled = true;
        };
    }, [courseId, semester, subjectId, subjectComponents]);

    useEffect(() => {
        let cancelled = false;

        const loadLegacyRecords = async () => {
            if (!courseId || !semester || !subjectId) {
                return;
            }

            if (!workflowState || workflowState.settings.isActive) {
                return;
            }

            if (loadingOCs) {
                setLoading(true);
                return;
            }

            setLoading(true);
            setLoadError(null);

            try {
                const filteredOCs = getFilteredOCsByBranch(courseId, subjectBranch);
                const ocIds = filteredOCs.map((oc) => oc.id);
                const academicRecords = ocIds.length ? await fetchBulkAcademics(ocIds) : [];

                const legacyRows: StudentRow[] = filteredOCs.map((oc) => {
                    const record = academicRecords.find(
                        (item) =>
                            item.ocId === oc.id &&
                            item.semester === semester &&
                            item.subjectId === subjectId,
                    );

                    const phase1 = includeTheory ? record?.theory?.phaseTest1Marks?.toString() ?? "" : "";
                    const phase2 = includeTheory ? record?.theory?.phaseTest2Marks?.toString() ?? "" : "";
                    const tutorial = includeTheory ? record?.theory?.tutorial ?? "" : "";
                    const final = includeTheory ? record?.theory?.finalMarks?.toString() ?? "" : "";
                    const contentOfExp = includePractical ? formatMarksInput(record?.practical?.contentOfExpMarks) : "";
                    const maintOfExp = includePractical ? formatMarksInput(record?.practical?.maintOfExpMarks) : "";
                    const practicalExam = includePractical ? formatMarksInput(record?.practical?.practicalMarks) : "";
                    const viva = includePractical ? formatMarksInput(record?.practical?.vivaMarks) : "";
                    const practicalBreakdownTotal = derivePracticalTotal({
                        contentOfExp,
                        maintOfExp,
                        practicalExam,
                        viva,
                    });
                    const practical = includePractical
                        ? practicalBreakdownTotal || (record?.practical?.finalMarks?.toString() ?? "")
                        : "";
                    const sessional = includeTheory ? toNum(phase1) + toNum(phase2) + toNum(tutorial) : 0;
                    const total =
                        sessional +
                        (includeTheory ? toNum(final) : 0) +
                        (includePractical ? toNum(practical) : 0);

                    return {
                        id: oc.id,
                        ocNo: oc.ocNo,
                        name: oc.name,
                        phase1,
                        phase2,
                        tutorial,
                        sessional,
                        final,
                        contentOfExp,
                        maintOfExp,
                        practicalExam,
                        viva,
                        practical,
                        total,
                    };
                });

                if (cancelled) return;
                setRows(legacyRows);
            } catch (err) {
                if (cancelled) return;
                const message = err instanceof Error ? err.message : "Failed to load academic records.";
                setLoadError(message);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadLegacyRecords();

        return () => {
            cancelled = true;
        };
    }, [
        courseId,
        semester,
        subjectId,
        subjectBranch,
        includeTheory,
        includePractical,
        workflowState,
        loadingOCs,
        getFilteredOCsByBranch,
        fetchBulkAcademics,
    ]);

    const updateRow = (index: number, key: keyof StudentRow, value: string) => {
        setRows((prev) => {
            const next = [...prev];
            const row = { ...next[index], [key]: value };

            if ((practicalComponentKeys as readonly string[]).includes(key)) {
                row.practical = derivePracticalTotal(row);
            }

            const sessional = includeTheory ? toNum(row.phase1) + toNum(row.phase2) + toNum(row.tutorial) : 0;
            const total =
                sessional +
                (includeTheory ? toNum(row.final) : 0) +
                (includePractical ? toNum(row.practical) : 0);

            row.sessional = sessional;
            row.total = total;
            next[index] = row;
            return next;
        });
        setIsDirty(true);
    };

    const saveLegacy = async () => {
        setSaving(true);
        try {
            const items: BulkAcademicItem[] = rows.map((row) => ({
                op: "upsert" as const,
                ocId: row.id,
                semester,
                subjectId,
                theory: includeTheory
                    ? {
                        tutorial: row.tutorial,
                        phaseTest1Marks: toNum(row.phase1),
                        phaseTest2Marks: toNum(row.phase2),
                        finalMarks: toNum(row.final),
                    }
                    : undefined,
                practical: includePractical ? buildPracticalPayload(row) : undefined,
            }));

            const success = await saveBulkAcademics({
                items,
                failFast: true,
            });

            if (!success) {
                throw new Error("Failed to save academic records.");
            }

            setLegacyEditMode(false);
            setIsDirty(false);
            toast.success(`Saved marks for ${rows.length} student${rows.length > 1 ? "s" : ""}.`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save academic records.");
        } finally {
            setSaving(false);
        }
    };

    const saveWorkflowDraft = async (options?: { message?: string; silent?: boolean }) => {
        if (!workflowState) throw new Error("Workflow state not loaded.");
        const payload = buildWorkflowDraftPayload(workflowState.draftPayload, rows, subjectComponents);
        const result = await marksWorkflowApi.applyAcademicsWorkflowAction(
            { courseId, semester, subjectId },
            {
                action: "SAVE_DRAFT",
                revision: workflowState.currentRevision ?? null,
                payload,
                message: options?.message,
            },
        );
        setWorkflowState(result);
        setRows(buildRowsFromWorkflowPayload(result.draftPayload, subjectComponents));
        setIsDirty(false);
        if (!options?.silent) {
            toast.success("Draft saved successfully.");
        }
        return result;
    };

    const runWorkflowAction = async (
        action: Exclude<AcademicsWorkflowActionInput["action"], "SAVE_DRAFT">,
    ) => {
        if (!workflowState) return;

        setSaving(true);
        try {
            let state = workflowState;
            const trimmedMessage = actionMessage.trim();

            if (action === "OVERRIDE_PUBLISH") {
                if (!trimmedMessage) {
                    throw new Error("A message is required for override publish.");
                }

                const payload = buildWorkflowDraftPayload(state.draftPayload, rows, subjectComponents);
                state = await marksWorkflowApi.applyAcademicsWorkflowAction(
                    { courseId, semester, subjectId },
                    {
                        action: "OVERRIDE_PUBLISH",
                        revision: state.currentRevision ?? 0,
                        payload,
                        message: trimmedMessage,
                    },
                );
                setWorkflowState(state);
                setRows(buildRowsFromWorkflowPayload(state.draftPayload, subjectComponents));
                setIsDirty(false);
                setActionMessage("");
                toast.success("Verified data overridden successfully.");
                return;
            }

            if (isDirty && canSaveDraft) {
                state = await saveWorkflowDraft({
                    message: trimmedMessage || undefined,
                    silent: true,
                });
            }

            let nextState: AcademicsWorkflowStateResponse | null = null;

            if (action === "SUBMIT_FOR_VERIFICATION") {
                nextState = await marksWorkflowApi.applyAcademicsWorkflowAction(
                    { courseId, semester, subjectId },
                    {
                        action,
                        revision: state.currentRevision ?? 1,
                    },
                );
                toast.success("Draft submitted for verification.");
            }

            if (action === "REQUEST_CHANGES") {
                if (!trimmedMessage) {
                    throw new Error("A message is required to request changes.");
                }
                nextState = await marksWorkflowApi.applyAcademicsWorkflowAction(
                    { courseId, semester, subjectId },
                    {
                        action,
                        revision: state.currentRevision ?? 1,
                        message: trimmedMessage,
                    },
                );
                toast.success("Changes requested.");
            }

            if (action === "VERIFY_AND_PUBLISH") {
                nextState = await marksWorkflowApi.applyAcademicsWorkflowAction(
                    { courseId, semester, subjectId },
                    {
                        action,
                        revision: state.currentRevision ?? 1,
                        message: trimmedMessage || undefined,
                    },
                );
                toast.success("Draft verified and published.");
            }

            if (nextState) {
                setWorkflowState(nextState);
                setRows(buildRowsFromWorkflowPayload(nextState.draftPayload, subjectComponents));
                setIsDirty(false);
                setActionMessage("");
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Workflow action failed.");
        } finally {
            setSaving(false);
        }
    };

    const handlePrimarySave = async () => {
        if (workflowEnabled) {
            setSaving(true);
            try {
                const trimmedMessage = actionMessage.trim();
                if (workflowStatus === "PENDING_VERIFICATION" && !trimmedMessage) {
                    throw new Error("Verifier draft saves require a message.");
                }
                await saveWorkflowDraft({ message: trimmedMessage || undefined });
                setActionMessage("");
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Draft save failed.");
            } finally {
                setSaving(false);
            }
            return;
        }

        await saveLegacy();
    };

    const downloadTemplate = () => {
        const emptyTemplateRow = Object.fromEntries(templateColumns.map((column) => [column.label, ""]));
        const worksheet = XLSX.utils.json_to_sheet(templateRows.length ? templateRows : [emptyTemplateRow]);
        worksheet["!cols"] = templateColumns.map((column) => ({
            wch: column.key === "name" ? 28 : Math.max(12, column.label.length + 2),
        }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Bulk Academics");
        XLSX.writeFile(workbook, `bulk-academics-sem${semester}-template.xlsx`);
    };

    const applyImportedRows = (sheetRows: SheetRow[]) => {
        const result = importBulkAcademicMarksRows(rows, sheetRows, subjectComponents);

        if (result.updatedRows === 0) {
            toast.error("No marks were imported. Check OC No, Name, and column headers in the selected sheet.");
        } else {
            setRows(result.rows);
            setIsDirty(true);
            if (!workflowEnabled) {
                setLegacyEditMode(true);
            }
            toast.success(
                `Imported ${result.updatedCells} mark${result.updatedCells === 1 ? "" : "s"} for ${result.updatedRows} cadet${result.updatedRows === 1 ? "" : "s"}.`,
            );
        }

        const warnings: string[] = [];
        if (result.unmatchedRows > 0) warnings.push(`${result.unmatchedRows} unmatched row${result.unmatchedRows === 1 ? "" : "s"}`);
        if (result.duplicateRows > 0) warnings.push(`${result.duplicateRows} duplicate row${result.duplicateRows === 1 ? "" : "s"}`);
        if (result.invalidCells.length > 0) {
            const firstInvalid = result.invalidCells[0];
            warnings.push(
                `${result.invalidCells.length} invalid mark cell${result.invalidCells.length === 1 ? "" : "s"}${firstInvalid ? `, first at row ${firstInvalid.row} (${firstInvalid.field})` : ""}`,
            );
        }
        if (warnings.length > 0) {
            toast.warning(`Import skipped ${warnings.join(", ")}.`);
        }
    };

    const parseExcelFile = (file: File): Promise<SheetRow[]> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: "array", cellDates: true });
                    const sheetName = workbook.SheetNames[0];
                    if (!sheetName) {
                        resolve([]);
                        return;
                    }
                    const worksheet = workbook.Sheets[sheetName];
                    if (!worksheet) {
                        resolve([]);
                        return;
                    }
                    resolve(XLSX.utils.sheet_to_json<SheetRow>(worksheet, { raw: true, defval: "" }));
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error("Failed to read the selected file."));
            reader.readAsArrayBuffer(file);
        });

    const parseCsvFile = (file: File): Promise<SheetRow[]> =>
        new Promise((resolve, reject) => {
            Papa.parse<SheetRow>(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => resolve(results.data),
                error: (err) => reject(err),
            });
        });

    const handleMarksFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const input = event.currentTarget;
        const file = input.files?.[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();
        setImporting(true);

        try {
            const sheetRows = fileName.endsWith(".csv")
                ? await parseCsvFile(file)
                : fileName.endsWith(".xlsx") || fileName.endsWith(".xls")
                    ? await parseExcelFile(file)
                    : null;

            if (!sheetRows) {
                throw new Error("Unsupported file type. Allowed files: .xlsx, .xls, .csv.");
            }

            if (sheetRows.length === 0) {
                throw new Error("The selected sheet has no data rows.");
            }

            applyImportedRows(sheetRows);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to import marks from the selected file.");
        } finally {
            setImporting(false);
            input.value = "";
        }
    };

    const columns: TableColumn<StudentRow>[] = useMemo(() => {
        const theoryColumns: TableColumn<StudentRow>[] = includeTheory
            ? [
                ...(["phase1", "phase2", "tutorial"] as const).map((key) => ({
                    key,
                    label: key === "phase1" ? "PH-I" : key === "phase2" ? "PH-II" : "Tutorial",
                    width: "120px",
                    className: "min-w-[7.5rem] whitespace-nowrap",
                    render: (_: StudentRow[keyof StudentRow], row: StudentRow, index: number) => (
                        <Input
                            value={row[key]}
                            disabled={inputsDisabled}
                            onChange={(e) => updateRow(index, key, e.target.value)}
                            className={standardMarksInputClassName}
                            type="text"
                        />
                    ),
                })),
                {
                    key: "sessional",
                    label: "Sessional",
                    width: "120px",
                    className: "min-w-[7.5rem] whitespace-nowrap text-sm font-semibold bg-muted/50 text-center",
                },
                {
                    key: "final",
                    label: "Final",
                    headerRender: (
                        <span className="inline-flex flex-col leading-tight">
                            <span>Final</span>
                            <span className="text-[11px] text-muted-foreground font-bold">(Theory)</span>
                        </span>
                    ),
                    width: "120px",
                    className: "min-w-[7.5rem] whitespace-nowrap",
                    render: (_: StudentRow[keyof StudentRow], row: StudentRow, index: number) => (
                        <Input
                            value={row.final}
                            disabled={inputsDisabled}
                            onChange={(e) => updateRow(index, "final", e.target.value)}
                            className={standardMarksInputClassName}
                            type="text"
                        />
                    ),
                },
            ]
            : [];

        const practicalColumns: TableColumn<StudentRow>[] = includePractical
            ? [
                ...([
                    { key: "contentOfExp", label: "Conduct of Exp" },
                    { key: "maintOfExp", label: "Maint of Records" },
                    { key: "practicalExam", label: "Practical Exam" },
                    { key: "viva", label: "Viva" },
                ] as const).map(({ key, label }) => ({
                    key,
                    label,
                    width: "150px",
                    className: "min-w-[9rem] whitespace-nowrap",
                    render: (_: StudentRow[keyof StudentRow], row: StudentRow, index: number) => (
                        <Input
                            value={row[key]}
                            disabled={inputsDisabled}
                            onChange={(e) => updateRow(index, key, e.target.value)}
                            className={wideMarksInputClassName}
                            type="text"
                        />
                    ),
                })),
                {
                    key: "practical",
                    label: "Practical",
                    width: "120px",
                    className: "min-w-[7.5rem] whitespace-nowrap",
                    render: (_: StudentRow[keyof StudentRow], row: StudentRow) => (
                        <Input
                            value={row.practical}
                            disabled
                            readOnly
                            className={readonlyMarksInputClassName}
                            type="text"
                        />
                    ),
                },
            ]
            : [];

        return [
            {
                key: "ocNo",
                label: "OC No",
                width: "120px",
                className: "min-w-[7.5rem] whitespace-nowrap text-sm font-medium",
            },
            {
                key: "name",
                label: "Name",
                width: "280px",
                className: "min-w-[18rem] text-sm font-medium",
            },
            ...theoryColumns,
            ...practicalColumns,
            {
                key: "total",
                label: "Total",
                width: "120px",
                className: "min-w-[7.5rem] whitespace-nowrap text-sm font-bold bg-muted/50 text-center",
            },
        ];
    }, [includeTheory, includePractical, inputsDisabled]);

    const config: TableConfig<StudentRow> = {
        columns,
        features: {
            search: true,
            sorting: false,
            pagination: false,
        },
        styling: {
            compact: false,
            bordered: true,
            striped: true,
            hover: true,
        },
        theme: {
            variant: "blue",
        },
        emptyState: {
            message: loading || loadingOCs ? "Loading students..." : "No students found",
        },
    };

    return (
        <div className="space-y-4 mt-6">
            {(error || loadError) && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded">
                    {error || loadError}
                </div>
            )}

            {workflowEnabled && workflowState && (
                <div className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <Badge variant={getStatusTone(workflowStatus)}>{workflowStatus.replaceAll("_", " ")}</Badge>
                        <span className="text-sm text-muted-foreground">{workflowState.selectionLabel}</span>
                        <span className="text-xs text-muted-foreground">
                            Verified: {workflowStatus === "VERIFIED" ? "Yes" : "No"}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Live academics data updates only after a verifier publishes this draft.
                    </p>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Workflow Message</label>
                        <Textarea
                            value={actionMessage}
                            onChange={(e) => setActionMessage(e.target.value)}
                            placeholder="Add a message for verifier edits, change requests, or overrides."
                            disabled={saving}
                        />
                    </div>
                </div>
            )}

            {subjectBranch && (
                <div className="bg-primary/10 border border-primary/30 text-primary px-4 py-2 rounded text-sm">
                    {subjectBranch === "C" ? (
                        <>Showing students from <strong>all branches</strong> (Common subject)</>
                    ) : (
                        <>Showing students from branch: <strong>{subjectBranch}</strong></>
                    )}
                </div>
            )}

            <input
                ref={importInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={handleMarksFileChange}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/20 px-4 py-3">
                <div className="text-sm text-muted-foreground">
                    {rows.length} cadet{rows.length === 1 ? "" : "s"} in the current bulk academics layout
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => setTemplateOpen(true)} disabled={rows.length === 0}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Sample Template
                    </Button>
                    <Button type="button" onClick={() => importInputRef.current?.click()} disabled={importDisabled}>
                        <Upload className="mr-2 h-4 w-4" />
                        {importing ? "Importing..." : "Upload Excel"}
                    </Button>
                </div>
            </div>

            <UniversalTable data={rows} config={config} />

            <div className="flex flex-wrap justify-center gap-3">
                {workflowEnabled ? (
                    <>
                        {canSaveDraft && (
                            <Button type="button" onClick={handlePrimarySave} disabled={saving || loading || !isDirty}>
                                {saving ? "Saving..." : "Save Draft"}
                            </Button>
                        )}
                        {canSubmit && (
                            <Button type="button" variant="secondary" onClick={() => runWorkflowAction("SUBMIT_FOR_VERIFICATION")} disabled={saving}>
                                Submit For Verification
                            </Button>
                        )}
                        {canRequestChanges && (
                            <Button type="button" variant="outline" onClick={() => runWorkflowAction("REQUEST_CHANGES")} disabled={saving}>
                                Request Changes
                            </Button>
                        )}
                        {canVerify && (
                            <Button type="button" onClick={() => runWorkflowAction("VERIFY_AND_PUBLISH")} disabled={saving}>
                                Verify And Publish
                            </Button>
                        )}
                        {canOverride && (
                            <Button type="button" variant="destructive" onClick={() => runWorkflowAction("OVERRIDE_PUBLISH")} disabled={saving}>
                                Override Publish
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                if (workflowState) {
                                    setRows(buildRowsFromWorkflowPayload(workflowState.draftPayload, subjectComponents));
                                    setIsDirty(false);
                                }
                            }}
                            disabled={saving || !isDirty}
                        >
                            Reset Draft
                        </Button>
                    </>
                ) : legacyEditMode ? (
                    <>
                        <Button onClick={handlePrimarySave} disabled={saving || loading || loadingOCs}>
                            {saving ? "Saving..." : "Save"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setLegacyEditMode(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                    </>
                ) : (
                    <Button onClick={() => setLegacyEditMode(true)} disabled={loading || loadingOCs}>
                        Edit
                    </Button>
                )}
            </div>

            {workflowEnabled && workflowState?.activityLog.length ? (
                <div className="rounded-lg border bg-card p-4 space-y-3">
                    <h3 className="text-sm font-semibold">Activity Log</h3>
                    <div className="space-y-2">
                        {workflowState.activityLog.slice().reverse().map((event) => (
                            <div key={event.id} className="rounded-md border px-3 py-2 text-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">{event.eventType.replaceAll("_", " ")}</Badge>
                                    <span className="font-medium">
                                        {event.actor ? `${event.actor.rank} ${event.actor.name}`.trim() : "System"}
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

            <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
                <DialogContent className="w-[95vw] sm:max-w-[95vw] lg:max-w-[90vw] max-h-[90vh] overflow-hidden p-0 flex flex-col">
                    <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                        <DialogTitle>Bulk Academics Sample Template</DialogTitle>
                        <DialogDescription>
                            Current course, semester, and subject layout. Computed columns are shown for reference.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="overflow-auto px-6 pb-4 min-h-0 flex-1">
                        <table className="min-w-max text-xs border">
                            <thead className="bg-muted sticky top-0">
                                <tr>
                                    {templateColumns.map((column) => (
                                        <th key={String(column.key)} className="px-3 py-2 text-left border-b whitespace-nowrap">
                                            <span className="inline-flex items-center gap-2">
                                                {column.label}
                                                {column.computed ? (
                                                    <Badge variant="outline" className="text-[10px]">Computed</Badge>
                                                ) : null}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {templatePreviewRows.length > 0 ? (
                                    templatePreviewRows.map((row, index) => (
                                        <tr key={`${row["OC No"] ?? "row"}-${index}`}>
                                            {templateColumns.map((column) => (
                                                <td key={column.label} className="px-3 py-2 border-b whitespace-nowrap">
                                                    {String(row[column.label] ?? "")}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td className="px-3 py-4 text-muted-foreground" colSpan={templateColumns.length}>
                                            No cadets loaded for the selected filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {templateRows.length > templatePreviewRows.length ? (
                            <p className="mt-3 text-xs text-muted-foreground">
                                Showing first {templatePreviewRows.length} rows. Download includes all {templateRows.length} rows.
                            </p>
                        ) : null}
                    </div>
                    <DialogFooter className="px-6 py-4 border-t shrink-0 bg-background">
                        <Button type="button" variant="outline" onClick={downloadTemplate}>
                            <Download className="mr-2 h-4 w-4" />
                            Download Template XLSX
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
