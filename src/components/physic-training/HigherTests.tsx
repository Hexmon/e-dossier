"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { UniversalTable, TableColumn, TableConfig } from "@/components/layout/TableLayout";
import { toast } from "sonner";

import { useHigherTestTemplates } from "@/hooks/useHigherTestTemplates";
import { usePhysicalTraining } from "@/hooks/usePhysicalTraining";

interface Row {
    ptTaskScoreId: string;
    column1: number;
    column2: string;
    column3: string;
    maxMarks: number;
    column5: number;
}

interface HigherTestsProps {
    onMarksChange: (marks: number) => void;
    activeSemester: string;
    ocId: string;
}



// Semester to API semester mapping (1-based index)
const semesterToApiSemester: Record<string, number> = {
    "I TERM": 1,
    "II TERM": 2,
    "III TERM": 3,
    "IV TERM": 4,
    "V TERM": 5,
    "VI TERM": 6,
};

export default function HigherTests({ onMarksChange, activeSemester, ocId }: HigherTestsProps) {
    const [isEditing, setIsEditing] = useState(false);

    // Use API hooks
    const { templates: higherTestTemplates, loading: templatesLoading, fetchTemplates } = useHigherTestTemplates();
    const { scores: apiScores, loading: scoresLoading, fetchScores, updateScores } = usePhysicalTraining(ocId);

    const [tableData, setTableData] = useState<Row[]>([]);

    // Fetch templates when semester changes
    useEffect(() => {
        const semesterNum = semesterToApiSemester[activeSemester];
        if (semesterNum) {
            fetchTemplates(semesterNum);
        }
    }, [activeSemester, fetchTemplates]);

    // Fetch scores when semester changes
    useEffect(() => {
        const semesterNum = semesterToApiSemester[activeSemester];
        if (semesterNum) {
            fetchScores(semesterNum);
        }
    }, [activeSemester, fetchScores]);

    // Populate table data from templates and scores
    useEffect(() => {
        if (higherTestTemplates && higherTestTemplates.length > 0) {
            const rows: Row[] = higherTestTemplates.map((template, index) => {
                const apiScore = apiScores.find(score => score.ptTaskScoreId === template.ptTaskScoreId);
                return {
                    ptTaskScoreId: template.ptTaskScoreId,
                    column1: index + 1,
                    column2: template.taskTitle,
                    column3: template.attemptCode,
                    column4: "",
                    maxMarks: template.maxMarks,
                    column5: apiScore ? apiScore.marksScored : 0,
                };
            });
            setTableData(rows);
        }
    }, [higherTestTemplates, apiScores]);

    const tableTotal = useMemo(() => {
        return tableData.reduce((sum, row) => sum + (row.column5 || 0), 0);
    }, [tableData]);

    const column3Options = useMemo(() => {
        return higherTestTemplates ? [...new Set(higherTestTemplates.map(t => t.attemptCode))] : [];
    }, [higherTestTemplates]);

    const handleChange = useCallback((id: string, key: keyof Row, value: string) => {
        const row = tableData.find(r => r.ptTaskScoreId === id);
        if (!row) return;

        // Validation for column5 (Marks Scored)
        if (key === "column5") {
            const numValue = parseFloat(value);

            // Allow empty values
            if (value.trim() === "") {
                setTableData(prev =>
                    prev.map(r => (r.ptTaskScoreId === id ? { ...r, column5: 0 } : r))
                );
                return;
            }

            // Validate marks
            if (isNaN(numValue) || numValue < 0) {
                toast.error("Marks must be a valid positive number");
                return;
            }

            if (numValue > row.maxMarks) {
                toast.error(`Marks scored cannot exceed maximum marks (${row.maxMarks})`);
                return;
            }
        }

        // Regular handling for other fields
        setTableData(prev =>
            prev.map(r => {
                if (r.ptTaskScoreId === id) {
                    if (key === "maxMarks" || key === "column5") {
                        return { ...r, [key]: parseFloat(value) || 0 };
                    }
                    return { ...r, [key]: value };
                }
                return r;
            }),
        );
    }, [tableData]);

    const handleEdit = () => setIsEditing(true);
    const handleSave = useCallback(async () => {
        // Validate all marks before saving
        for (const row of tableData) {
            if (row.column5 > 0 && row.column5 > row.maxMarks) {
                toast.error(`Invalid marks for ${row.column2}. Marks must be between 0 and ${row.maxMarks}`);
                return;
            }
        }

        // Prepare scores for API
        const scoresForApi = tableData.map((row) => ({
            ptTaskScoreId: row.ptTaskScoreId,
            marksScored: row.column5 || 0,
        }));

        // Save to API
        const semesterNum = semesterToApiSemester[activeSemester];
        if (scoresForApi.length > 0) {
            await updateScores(semesterNum, scoresForApi);
        }

        setIsEditing(false);
    }, [tableData, activeSemester, updateScores]);
    const handleCancel = () => setIsEditing(false);

    // Call parent callback when tableTotal changes
    useEffect(() => {
        onMarksChange(tableTotal);
    }, [tableTotal, onMarksChange]);

    // Reset when semester changes
    useEffect(() => {
        onMarksChange(0);
    }, [activeSemester, onMarksChange]);

    // Add total row to data
    const totalRow: Row = {
        ptTaskScoreId: "total",
        column1: 0,
        column2: "Total",
        column3: "—",
        maxMarks: tableData.reduce((sum, r) => sum + (r.maxMarks || 0), 0),
        column5: tableTotal
    };

    const displayData = [...tableData, totalRow];

    const columns: TableColumn<Row>[] = [
        {
            key: "column1",
            label: "S.No",
            render: (value, row) => {
                if (row.ptTaskScoreId === "total") return "—";
                return value;
            }
        },
        {
            key: "column2",
            label: "Test",
            render: (value) => value
        },
        {
            key: "maxMarks",
            label: "Max Marks",
            type: "number",
            render: (value, row) => {
                if (row.ptTaskScoreId === "total") {
                    return <span className="text-center block">{value}</span>;
                }
                return isEditing ? (
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) => handleChange(row.ptTaskScoreId, "maxMarks", e.target.value)}
                        placeholder="Max"
                        className="w-full"
                    />
                ) : (
                    <span>{value || "-"}</span>
                );
            }
        },
        {
            key: "column3",
            label: "Category",
            render: (value, row) => {
                if (row.ptTaskScoreId === "total") {
                    return <span className="text-center block">—</span>;
                }
                return (
                    <Select
                        value={value}
                        onValueChange={(v) => handleChange(row.ptTaskScoreId, "column3", v)}
                        disabled={!isEditing}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                            {column3Options.map(opt => (
                                <SelectItem key={opt} value={opt}>
                                    {opt}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            }
        },
        {
            key: "column5",
            label: "Marks Scored",
            type: "number",
            render: (value, row) => {
                if (row.ptTaskScoreId === "total") {
                    return <span className="text-center block">{value}</span>;
                }
                return isEditing ? (
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) => handleChange(row.ptTaskScoreId, "column5", e.target.value)}
                        placeholder="Enter marks"
                        className="w-full"
                    />
                ) : (
                    <span>{value || "-"}</span>
                );
            }
        }
    ];

    const config: TableConfig<Row> = {
        columns,
        features: {
            sorting: false,
            filtering: false,
            pagination: false,
            selection: false,
            search: false
        },
        styling: {
            compact: false,
            bordered: true,
            striped: false,
            hover: true
        }
    };

    return (
        <CardContent className="space-y-4">
            <h2 className="text-lg font-bold text-left text-gray-700">Higher Tests (30 Marks)</h2>
            <div className="border border-gray-300 rounded-lg">
                <UniversalTable<Row>
                    data={displayData}
                    config={config}
                />
            </div>

            {/* Edit Buttons */}
            <div className="flex gap-3 justify-center mt-4">
                {isEditing ? (
                    <>
                        <Button variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>Save</Button>
                    </>
                ) : (
                    <Button onClick={handleEdit}>Edit</Button>
                )}
            </div>

            {/* Auto-save indicator */}
            <p className="text-sm text-muted-foreground text-center mt-2">
                * Changes are automatically saved
            </p>
        </CardContent>
    );
}