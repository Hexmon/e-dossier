"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
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

import type { RootState } from "@/store";
import { saveSwimming1Data } from "@/store/slices/physicalTrainingSlice";

interface Row {
    id: string;
    column1: number | string;
    column2: string;
    column3: string;
    column4: string;
    maxMarks: number;
    column5: number;
}

interface Swimming1Props {
    onMarksChange: (marks: number) => void;
    activeSemester: string;
    ocId: string;
}

const column3Options = ["M1", "M2", "A1", "A2", "A3"];
const column4Options = ["Pass", "Fail"];

const DEFAULT_DATA: Row[] = [
    { id: "1", column1: 1, column2: "25 meter", column3: "", column4: "", maxMarks: 10, column5: 0 },
    { id: "2", column1: 2, column2: "Jump", column3: "", column4: "", maxMarks: 20, column5: 0 },
];

export default function Swimming1({ onMarksChange, activeSemester, ocId }: Swimming1Props) {
    const dispatch = useDispatch();
    const [isEditing, setIsEditing] = useState(false);

    // Get saved data from Redux
    const savedData = useSelector((state: RootState) =>
        state.physicalTraining.forms[ocId]?.[activeSemester]?.swimming1Data
    );

    const [tableData, setTableData] = useState<Row[]>(savedData || DEFAULT_DATA);

    // Load saved data when semester changes
    useEffect(() => {
        if (savedData) {
            setTableData(savedData);
        }
    }, [savedData, activeSemester]);

    // Auto-save to Redux whenever data changes
    useEffect(() => {
        if (tableData && ocId) {
            dispatch(saveSwimming1Data({
                ocId,
                semester: activeSemester,
                data: tableData
            }));
        }
    }, [tableData, ocId, activeSemester, dispatch]);

    const tableTotal = useMemo(() => {
        return tableData.reduce((sum, row) => sum + (row.column5 || 0), 0);
    }, [tableData]);

    const handleChange = (id: string, key: keyof Row, value: string) => {
        const row = tableData.find(r => r.id === id);
        if (!row) return;

        // Validation for column5 (Marks Scored)
        if (key === "column5") {
            const numValue = parseFloat(value);

            // Allow empty values
            if (value.trim() === "") {
                setTableData(prev =>
                    prev.map(r => (r.id === id ? { ...r, column5: 0 } : r))
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
                if (r.id === id) {
                    if (key === "maxMarks" || key === "column5") {
                        return { ...r, [key]: parseFloat(value) || 0 };
                    }
                    return { ...r, [key]: value };
                }
                return r;
            }),
        );
    };

    const handleEdit = () => setIsEditing(true);

    const handleSave = () => {
        // Validate all marks before saving
        for (const row of tableData) {
            if (row.column5 > 0 && row.column5 > row.maxMarks) {
                toast.error(`Invalid marks for ${row.column2}. Marks must be between 0 and ${row.maxMarks}`);
                return;
            }
        }

        setIsEditing(false);
        toast.success("Swimming data saved successfully");
        console.log("Swimming Table saved:", tableData);
    };

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
        id: "total",
        column1: "—",
        column2: "Total",
        column3: "—",
        column4: "—",
        maxMarks: tableData.reduce((sum, r) => sum + (r.maxMarks || 0), 0),
        column5: tableTotal
    };

    const displayData = [...tableData, totalRow];

    const columns: TableColumn<Row>[] = [
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
                    return <span className="text-center block">{value}</span>;
                }
                return isEditing ? (
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) => handleChange(row.id, "maxMarks", e.target.value)}
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
                if (row.id === "total") {
                    return <span className="text-center block">—</span>;
                }
                return (
                    <Select
                        value={value}
                        onValueChange={(v) => handleChange(row.id, "column3", v)}
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
            key: "column4",
            label: "Status",
            render: (value, row) => {
                if (row.id === "total") {
                    return <span className="text-center block">—</span>;
                }
                return (
                    <Select
                        value={value}
                        onValueChange={(v) => handleChange(row.id, "column4", v)}
                        disabled={!isEditing}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            {column4Options.map(opt => (
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
                if (row.id === "total") {
                    return <span className="text-center block">{value}</span>;
                }
                return isEditing ? (
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) => handleChange(row.id, "column5", e.target.value)}
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
            <h2 className="text-lg font-bold text-left text-gray-700">
                Swimming ({activeSemester === "III TERM" ? 35 : 30} marks)
            </h2>
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