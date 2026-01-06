"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

interface TableRow {
    id: string;
    column1: number | string;
    column2: string;
    maxMarks: number;
    column3: string;
    column4: string;
    column5: number;
}

interface Ipet2FormProps {
    onMarksChange: (marks: number) => void;
    activeSemester: string;
}

const column3Options = ["M1", "M2", "A1", "A2", "A3"];
const column4Options = ["Pass", "Fail"];

export default function Ipet2Form({ onMarksChange, activeSemester }: Ipet2FormProps) {
    const [isEditing, setIsEditing] = useState(false);

    const [tableData, setTableData] = useState<TableRow[]>([
        { id: "1", column1: 1, column2: "Back Roll", maxMarks: 10, column3: "", column4: "", column5: 0 },
        { id: "2", column1: 2, column2: "Dive Roll", maxMarks: 5, column3: "", column4: "", column5: 0 },
        { id: "3", column1: 3, column2: "T/A Vault", maxMarks: 10, column3: "", column4: "", column5: 0 },
        { id: "4", column1: 4, column2: "Rope", maxMarks: 15, column3: "", column4: "", column5: 0 },
        { id: "5", column1: 5, column2: "Chest Touch/Heaving", maxMarks: 10, column3: "", column4: "", column5: 0 },
    ]);

    const totalMaxMarks = useMemo(
        () => tableData.reduce((sum, r) => sum + (r.maxMarks || 0), 0),
        [tableData]
    );

    const totalMarksScored = useMemo(
        () => tableData.reduce((sum, r) => sum + (r.column5 || 0), 0),
        [tableData]
    );

    const handleColumn3Change = (rowId: string, value: string) => {
        setTableData((prev) =>
            prev.map((row) => (row.id === rowId ? { ...row, column3: value } : row))
        );
    };

    const handleColumn4Change = (rowId: string, value: string) => {
        setTableData((prev) =>
            prev.map((row) => (row.id === rowId ? { ...row, column4: value } : row))
        );
    };

    const handleMaxMarksChange = (rowId: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        setTableData((prev) =>
            prev.map((row) => (row.id === rowId ? { ...row, maxMarks: numValue } : row))
        );
    };

    const handleColumn5Change = (rowId: string, value: string) => {
        const row = tableData.find(r => r.id === rowId);
        if (!row) return;

        const numValue = parseFloat(value);

        // Allow empty values
        if (value.trim() === "") {
            setTableData((prev) =>
                prev.map((r) => (r.id === rowId ? { ...r, column5: 0 } : r))
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

        setTableData((prev) =>
            prev.map((r) => (r.id === rowId ? { ...r, column5: numValue } : r))
        );
    };

    useEffect(() => {
        onMarksChange(totalMarksScored);
    }, [totalMarksScored, onMarksChange]);

    const handleSave = () => {
        // Validate all marks before saving
        for (const row of tableData) {
            if (row.column5 > 0 && row.column5 > row.maxMarks) {
                toast.error(`Invalid marks for ${row.column2}. Marks must be between 0 and ${row.maxMarks}`);
                return;
            }
        }

        setIsEditing(false);
        toast.success("IPET data saved successfully");
    };

    // Add total row to data
    const totalRow: TableRow = {
        id: "total",
        column1: "",
        column2: "Total",
        maxMarks: totalMaxMarks,
        column3: "—",
        column4: "—",
        column5: totalMarksScored
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
                if (row.id === "total") {
                    return <span>{value}</span>;
                }
                return isEditing ? (
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) => handleMaxMarksChange(row.id, e.target.value)}
                    />
                ) : (
                    <span>{value}</span>
                );
            }
        },
        {
            key: "column3",
            label: "Category",
            render: (value, row) => {
                if (row.id === "total") {
                    return <span className="text-center block">—</span>;
                }
                return (
                    <Select
                        value={value}
                        onValueChange={(val) => handleColumn3Change(row.id, val)}
                        disabled={!isEditing}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                            {column3Options.map((option) => (
                                <SelectItem key={option} value={option}>
                                    {option}
                                </SelectItem>
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
                if (row.id === "total") {
                    return <span className="text-center block">—</span>;
                }
                return (
                    <Select
                        value={value}
                        onValueChange={(val) => handleColumn4Change(row.id, val)}
                        disabled={!isEditing}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            {column4Options.map((option) => (
                                <SelectItem key={option} value={option}>
                                    {option}
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
                if (row.id === "total") {
                    return <span>{value}</span>;
                }
                return isEditing ? (
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) => handleColumn5Change(row.id, e.target.value)}
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

                <h2 className="text-lg font-bold text-left text-gray-700">IPET (50 Marks)</h2>

                <div className="border border-gray-300 rounded-lg">
                    <UniversalTable<TableRow>
                        data={displayData}
                        config={config}
                    />
                </div>

                {/* Edit Buttons */}
                <div className="flex gap-3 justify-center mt-4">
                    {isEditing ? (
                        <>
                            <Button variant="outline" onClick={() => setIsEditing(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave}>Save</Button>
                        </>
                    ) : (
                        <Button onClick={() => setIsEditing(true)}>Edit</Button>
                    )}
                </div>

            </CardContent>
        </div>
    );
}
