"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TableColumn, TableConfig, UniversalTable } from "../layout/TableLayout";
import { BulkAcademicItem } from "@/app/lib/api/academicsMarksApi";
import { useAcademicsMarks } from "@/hooks/useAcademicsMarks";
import { computePracticalTotalMarks } from "@/app/lib/academic-marks-core";
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
}

export type StudentRow = {
    id: string;
    ocNo: string;
    name: string;
    phase1: string;
    phase2: string;
    tutorial: string;
    sessional: number;
    final: string;
    contentOfExp: string;
    maintOfExp: string;
    practicalExam: string;
    viva: string;
    practical: string;
    total: number;
};

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

function buildRowsFromWorkflowPayload(payload: AcademicsWorkflowDraftPayload): StudentRow[] {
    return payload.items.map((item) => {
        const phase1 = item.theory?.phaseTest1Marks != null ? String(item.theory.phaseTest1Marks) : "";
        const phase2 = item.theory?.phaseTest2Marks != null ? String(item.theory.phaseTest2Marks) : "";
        const tutorial = item.theory?.tutorial ?? "";
        const final = item.theory?.finalMarks != null ? String(item.theory.finalMarks) : "";
        const contentOfExp = formatMarksInput(item.practical?.contentOfExpMarks);
        const maintOfExp = formatMarksInput(item.practical?.maintOfExpMarks);
        const practicalExam = formatMarksInput(item.practical?.practicalMarks);
        const viva = formatMarksInput(item.practical?.vivaMarks);
        const practicalBreakdownTotal = derivePracticalTotal({
            contentOfExp,
            maintOfExp,
            practicalExam,
            viva,
        });
        const practical = practicalBreakdownTotal || formatMarksInput(item.practical?.finalMarks);
        const sessional = toNum(phase1) + toNum(phase2) + toNum(tutorial);
        const total = sessional + toNum(final) + toNum(practical);

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
): AcademicsWorkflowDraftPayload {
    return {
        ...basePayload,
        items: rows.map((row) => ({
            ocId: row.id,
            ocNo: row.ocNo,
            name: row.name,
            branch: basePayload.items.find((item) => item.ocId === row.id)?.branch ?? null,
            theory: {
                phaseTest1Marks: toNullableNumber(row.phase1),
                phaseTest2Marks: toNullableNumber(row.phase2),
                tutorial: row.tutorial.trim() || undefined,
                finalMarks: toNullableNumber(row.final),
            },
            practical: buildPracticalPayload(row),
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

    const workflowEnabled = workflowState?.settings.isActive ?? false;
    const workflowStatus = workflowState?.ticket.status ?? "DRAFT";
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
                    setRows(buildRowsFromWorkflowPayload(workflow.draftPayload));
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
    }, [courseId, semester, subjectId]);

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

                    const phase1 = record?.theory?.phaseTest1Marks?.toString() ?? "";
                    const phase2 = record?.theory?.phaseTest2Marks?.toString() ?? "";
                    const tutorial = record?.theory?.tutorial ?? "";
                    const final = record?.theory?.finalMarks?.toString() ?? "";
                    const contentOfExp = formatMarksInput(record?.practical?.contentOfExpMarks);
                    const maintOfExp = formatMarksInput(record?.practical?.maintOfExpMarks);
                    const practicalExam = formatMarksInput(record?.practical?.practicalMarks);
                    const viva = formatMarksInput(record?.practical?.vivaMarks);
                    const practicalBreakdownTotal = derivePracticalTotal({
                        contentOfExp,
                        maintOfExp,
                        practicalExam,
                        viva,
                    });
                    const practical = practicalBreakdownTotal || (record?.practical?.finalMarks?.toString() ?? "");
                    const sessional = toNum(phase1) + toNum(phase2) + toNum(tutorial);
                    const total = sessional + toNum(final) + toNum(practical);

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

            const sessional = toNum(row.phase1) + toNum(row.phase2) + toNum(row.tutorial);
            const total = sessional + toNum(row.final) + toNum(row.practical);

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
                theory: {
                    tutorial: row.tutorial,
                    phaseTest1Marks: toNum(row.phase1),
                    phaseTest2Marks: toNum(row.phase2),
                    finalMarks: toNum(row.final),
                },
                practical: buildPracticalPayload(row),
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
        const payload = buildWorkflowDraftPayload(workflowState.draftPayload, rows);
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
        setRows(buildRowsFromWorkflowPayload(result.draftPayload));
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

                const payload = buildWorkflowDraftPayload(state.draftPayload, rows);
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
                setRows(buildRowsFromWorkflowPayload(state.draftPayload));
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
                setRows(buildRowsFromWorkflowPayload(nextState.draftPayload));
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

    const columns: TableColumn<StudentRow>[] = useMemo(
        () => [
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
            {
                key: "total",
                label: "Total",
                width: "120px",
                className: "min-w-[7.5rem] whitespace-nowrap text-sm font-bold bg-muted/50 text-center",
            },
        ],
        [inputsDisabled],
    );

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
                                    setRows(buildRowsFromWorkflowPayload(workflowState.draftPayload));
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
        </div>
    );
}
