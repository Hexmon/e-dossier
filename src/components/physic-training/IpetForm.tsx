"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { UniversalTable, TableColumn, TableConfig } from "@/components/layout/TableLayout";
import { toast } from "sonner";

import { useIpetTemplates } from "@/hooks/useIpetTemplates";
import { usePhysicalTraining } from "@/hooks/usePhysicalTraining";

interface TableRow {
    ptTaskScoreId: string;
    column1: number | string;
    column2: string;
    column3: string;
    column4: string;
    maxMarks: number;
    column5: number;
}

interface Ipet1FormProps {
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

const column4Options = ["Pass", "Fail"];

// Default data is now populated from API

export default function Ipet1Form({ onMarksChange, activeSemester, ocId }: Ipet1FormProps) {
    const [isEditing, setIsEditing] = useState(false);

    // Use API hooks
    const { templates: ipetTemplates, loading: templatesLoading, fetchTemplates } = useIpetTemplates();
    const { scores: apiScores, loading: scoresLoading, fetchScores, updateScores } = usePhysicalTraining(ocId);

    const [tableData, setTableData] = useState<TableRow[]>([]);

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
        if (ipetTemplates && ipetTemplates.length > 0) {
            const rows: TableRow[] = ipetTemplates.map((template, index) => {
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
    }, [ipetTemplates, apiScores]);

    const tableTotal = useMemo(() => {
        return tableData.reduce((sum, row) => sum + (row.column5 || 0), 0);
    }, [tableData]);

    const totalMaxMarks = useMemo(() => {
        return tableData.reduce((sum, row) => sum + (row.maxMarks || 0), 0);
    }, [tableData]);

    const column3Options = useMemo(() => {
        return ipetTemplates ? [...new Set(ipetTemplates.map(t => t.attemptCode))] : [];
    }, [ipetTemplates]);

    const handleColumn3Change = useCallback((rowId: string, value: string) => {
        setTableData((prev) => prev.map((row) => (row.ptTaskScoreId === rowId ? { ...row, column3: value } : row)));
    }, []);

    const handleColumn4Change = useCallback((rowId: string, value: string) => {
        setTableData((prev) => prev.map((row) => (row.ptTaskScoreId === rowId ? { ...row, column4: value } : row)));
    }, []);

    const handleMaxMarksChange = useCallback((rowId: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        setTableData((prev) => prev.map((row) => (row.ptTaskScoreId === rowId ? { ...row, maxMarks: numValue } : row)));
    }, []);

    const handleColumn5Change = useCallback((rowId: string, value: string) => {
        const row = tableData.find(r => r.ptTaskScoreId === rowId);
        if (!row) return;

        const numValue = parseFloat(value);

        if (value.trim() === "") {
            setTableData((prev) => prev.map((r) => (r.ptTaskScoreId === rowId ? { ...r, column5: 0 } : r)));
            return;
        }

        if (isNaN(numValue) || numValue < 0) {
            toast.error("Marks must be a valid positive number");
            return;
        }

        if (numValue > row.maxMarks) {
            toast.error(`Marks scored cannot exceed maximum marks (${row.maxMarks})`);
            return;
        }

        setTableData((prev) => prev.map((r) => (r.ptTaskScoreId === rowId ? { ...r, column5: numValue } : r)));
    }, [tableData]);

    useEffect(() => {
        onMarksChange(tableTotal);
    }, [tableTotal, onMarksChange]);

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

    const totalRow: TableRow = {
        ptTaskScoreId: "total",
        column1: "—",
        column2: "Total",
        column3: "—",
        column4: "—",
        maxMarks: tableData.reduce((sum, r) => sum + (r.maxMarks || 0), 0),
        column5: tableTotal
    };

    const displayData = [...tableData, totalRow];

    const columns: TableColumn<TableRow>[] = [
        {
            key: "column1",
            label: "S.No",
            render: (value) => value
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
                        onChange={(e) => handleMaxMarksChange(row.ptTaskScoreId, e.target.value)}
                        placeholder="Max"
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
                        onValueChange={(val) => handleColumn3Change(row.ptTaskScoreId, val)}
                        disabled={!isEditing}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                            {column3Options.map((option) => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            }
        },
        {
            key: "column4",
            label: "Status",
            render: (value, row) => {
                if (row.ptTaskScoreId === "total") {
                    return <span className="text-center block">—</span>;
                }
                return (
                    <Select
                        value={value}
                        onValueChange={(val) => handleColumn4Change(row.ptTaskScoreId, val)}
                        disabled={!isEditing}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            {column4Options.map((option) => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
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
                        onChange={(e) => handleColumn5Change(row.ptTaskScoreId, e.target.value)}
                        placeholder="Enter marks"
                        className="w-full"
                    />
                ) : (
                    <span>{value || "-"}</span>
                );
            }
        }
    ];

    const config: TableConfig<TableRow> = {
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
        <div className="mt-3 space-y-6">
            <CardContent className="space-y-6">
                <h2 className="text-lg font-bold text-left text-gray-700">IPET ({totalMaxMarks} Marks)</h2>

                <div className="border border-gray-300 rounded-lg">
                    <UniversalTable<TableRow>
                        data={displayData}
                        config={config}
                    />
                </div>

                <div className="flex gap-3 justify-center mt-4">
                    {isEditing ? (
                        <>
                            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                            <Button onClick={handleSave}>Save</Button>
                        </>
                    ) : (
                        <Button onClick={() => setIsEditing(true)}>Edit</Button>
                    )}
                </div>

                <p className="text-sm text-muted-foreground text-center mt-2">
                    * Changes are automatically saved
                </p>
            </CardContent>
        </div>
    );
}