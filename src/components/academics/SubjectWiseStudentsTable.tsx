"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TableColumn, TableConfig, UniversalTable } from "../layout/TableLayout";
import { BulkAcademicItem } from "@/app/lib/api/academicsMarksApi";
import { useAcademicsMarks } from "@/hooks/useAcademicsMarks";
import {
    computePracticalTotal,
    getPracticalComponentValue,
    PRACTICAL_COMPONENTS,
    PRACTICAL_TOTAL_MAX_MARKS,
    type PracticalComponentKey,
} from "@/lib/academics-practical";
import {
    computeTheorySessional,
    computeTheoryTotal,
    normalizePhaseTestCount,
} from "@/lib/academics-theory";

interface Props {
    courseId: string;
    semester: number;
    subjectId: string;
    subjectBranch: string | null;
    subjectPhaseTestCount: number;
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
    conductOfExp: string;
    maintOfApp: string;
    practicalTest: string;
    vivaVoce: string;
    practicalTotal: number;
    total: number;
};

export default function SubjectWiseStudentsTable({
    courseId,
    semester,
    subjectId,
    subjectBranch,
    subjectPhaseTestCount,
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
    const [isSaved, setIsSaved] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const phaseTestCount = normalizePhaseTestCount(subjectPhaseTestCount);

    const toNum = (v: string): number => {
        const num = Number(v);
        return isNaN(num) ? 0 : num;
    };

    // Filter OCs and fetch their academic records
    useEffect(() => {
        const loadAcademicRecords = async () => {
            // Wait for OCs to load first
            if (loadingOCs) {
                setLoading(true);
                return;
            }

            if (!courseId || !semester || !subjectId || allOCs.length === 0) {
                setRows([]);
                setLoading(false);
                return;
            }

            setLoading(true);

            console.log("Filtering with branch:", subjectBranch);

            // Filter by courseId AND branch
            const filteredOCs = getFilteredOCsByBranch(courseId, subjectBranch);

            console.log("Filtered OCs count:", filteredOCs.length);

            const ocIds = filteredOCs.map((oc) => oc.id);

            if (ocIds.length === 0) {
                setRows([]);
                setLoading(false);
                return;
            }

            // Fetch academic records
            const academicRecords = await fetchBulkAcademics(ocIds);

            // Create rows
            const newRows: StudentRow[] = filteredOCs.map((oc) => {
                const record = academicRecords.find(
                    (r) =>
                        r.ocId === oc.id &&
                        r.semester === semester &&
                        r.subjectId === subjectId
                );

                const phase1 = record?.theory?.phaseTest1Marks?.toString() ?? "";
                const phase2 =
                    phaseTestCount >= 2 ? record?.theory?.phaseTest2Marks?.toString() ?? "" : "";
                const tutorial = record?.theory?.tutorial ?? "";
                const final = record?.theory?.finalMarks?.toString() ?? "";
                const conductOfExp = getPracticalComponentValue(record?.practical, "conductOfExp")?.toString() ?? "";
                const maintOfApp = getPracticalComponentValue(record?.practical, "maintOfApp")?.toString() ?? "";
                const practicalTest = getPracticalComponentValue(record?.practical, "practicalTest")?.toString() ?? "";
                const vivaVoce = getPracticalComponentValue(record?.practical, "vivaVoce")?.toString() ?? "";

                const sessional = computeTheorySessional({
                    phaseTest1Marks: toNum(phase1),
                    phaseTest2Marks: toNum(phase2),
                    tutorial,
                }, phaseTestCount);
                const practicalTotal = computePracticalTotal(record?.practical);
                const total = computeTheoryTotal({
                    phaseTest1Marks: toNum(phase1),
                    phaseTest2Marks: toNum(phase2),
                    tutorial,
                    finalMarks: toNum(final),
                }, phaseTestCount) + practicalTotal;

                return {
                    id: oc.id,
                    ocNo: oc.ocNo,
                    name: oc.name,
                    phase1,
                    phase2,
                    tutorial,
                    sessional,
                    final,
                    conductOfExp,
                    maintOfApp,
                    practicalTest,
                    vivaVoce,
                    practicalTotal,
                    total,
                };
            });

            setRows(newRows);
            setIsSaved(true);
            setLoading(false);
        };

        loadAcademicRecords();
    }, [allOCs, loadingOCs, courseId, semester, subjectId, subjectBranch, phaseTestCount, getFilteredOCsByBranch, fetchBulkAcademics]);

    const updateRow = (index: number, key: keyof StudentRow, value: string) => {
        setRows((prev) => {
            const next = [...prev];
            const row = { ...next[index], [key]: value };

            const sessional = computeTheorySessional({
                phaseTest1Marks: toNum(row.phase1),
                phaseTest2Marks: toNum(row.phase2),
                tutorial: row.tutorial,
            }, phaseTestCount);
            const practicalTotal =
                toNum(row.conductOfExp) +
                toNum(row.maintOfApp) +
                toNum(row.practicalTest) +
                toNum(row.vivaVoce);
            const total = computeTheoryTotal({
                phaseTest1Marks: toNum(row.phase1),
                phaseTest2Marks: toNum(row.phase2),
                tutorial: row.tutorial,
                finalMarks: toNum(row.final),
            }, phaseTestCount) + practicalTotal;

            row.sessional = sessional;
            row.practicalTotal = practicalTotal;
            row.total = total;

            next[index] = row;
            return next;
        });
        setIsSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);

        const items: BulkAcademicItem[] = rows.map((row) => ({
            op: "upsert" as const,
            ocId: row.id,
            semester,
            subjectId,
            theory: {
                tutorial: row.tutorial,
                phaseTest1Marks: toNum(row.phase1),
                phaseTest2Marks: phaseTestCount >= 2 ? toNum(row.phase2) : undefined,
                finalMarks: toNum(row.final),
            },
            practical: {
                conductOfExp: toNum(row.conductOfExp),
                maintOfApp: toNum(row.maintOfApp),
                practicalTest: toNum(row.practicalTest),
                vivaVoce: toNum(row.vivaVoce),
                finalMarks: row.practicalTotal,
            },
        }));

        const success = await saveBulkAcademics({
            items,
            failFast: true,
        });

        if (success) {
            setIsSaved(true);
            toast.success(`Successfully saved marks for ${rows.length} student${rows.length > 1 ? 's' : ''}`);
        } else {
            toast.error("Failed to save academic records. Please try again.");
        }

        setSaving(false);
    };

    const columns: TableColumn<StudentRow>[] = useMemo(
        () => [
            {
                key: "ocNo",
                label: "OC No",
                width: "90px",
                className: "text-xs",
            },
            {
                key: "name",
                label: "Name",
                width: "220px",
                className: "text-xs font-medium break-words",
            },
            ...(["phase1", "phase2", "tutorial"] as const)
                .filter((key) => key !== "phase2" || phaseTestCount >= 2)
                .map((key) => ({
                key,
                label:
                    key === "phase1"
                        ? "PH-I"
                        : key === "phase2"
                            ? "PH-II"
                            : "Tutorial",
                width: "80px",
                render: (_: StudentRow[keyof StudentRow], row: StudentRow, index: number) => (
                    <Input
                        value={row[key]}
                        disabled={isSaved}
                        onChange={(e) => updateRow(index, key, e.target.value)}
                        className="h-7 text-xs text-center"
                        type="text"
                    />
                ),
            })),
            {
                key: "sessional",
                label: "Sessional",
                width: "80px",
                className: "text-xs font-semibold bg-muted/50 text-center",
            },
            {
                key: "final",
                label: "Final",
                width: "80px",
                render: (_: StudentRow[keyof StudentRow], row: StudentRow, index: number) => (
                    <Input
                        value={row.final}
                        disabled={isSaved}
                        onChange={(e) => updateRow(index, "final", e.target.value)}
                        className="h-7 text-xs text-center"
                        type="text"
                    />
                ),
            },
            ...PRACTICAL_COMPONENTS.map((component) => ({
                key: component.key as keyof StudentRow,
                label: `${component.label} (${component.maxMarks})`,
                width: "110px",
                render: (_: StudentRow[keyof StudentRow], row: StudentRow, index: number) => (
                    <Input
                        value={row[component.key as PracticalComponentKey]}
                        disabled={isSaved}
                        min={0}
                        max={component.maxMarks}
                        onChange={(e) => updateRow(index, component.key as keyof StudentRow, e.target.value)}
                        className="h-7 text-xs text-center"
                        type="number"
                    />
                ),
            })),
            {
                key: "practicalTotal",
                label: `Prac Total (${PRACTICAL_TOTAL_MAX_MARKS})`,
                width: "95px",
                className: "text-xs font-semibold bg-muted/50 text-center",
            },
            {
                key: "total",
                label: "Total",
                width: "80px",
                className: "text-xs font-bold bg-muted/50 text-center",
            },
        ],
        [isSaved, phaseTestCount]
    );

    const config: TableConfig<StudentRow> = {
        columns,
        features: {
            search: true,
            sorting: false,
            pagination: false,
        },
        styling: {
            compact: true,
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
            {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded">
                    {error}
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

            <div className="flex justify-center gap-4">
                {isSaved ? (
                    <Button onClick={() => setIsSaved(false)} disabled={loading || loadingOCs}>
                        Edit
                    </Button>
                ) : (
                    <Button onClick={handleSave} disabled={saving || loading || loadingOCs}>
                        {saving ? "Saving..." : "Save"}
                    </Button>
                )}
            </div>
        </div>
    );
}
