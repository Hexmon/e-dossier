"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
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

import type { RootState } from "@/store";
import { saveIpet1Data } from "@/store/slices/physicalTrainingSlice";

interface TableRow {
    id: string;
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

const column3Options = ["M1", "M2", "A1", "A2", "A3"];
const column4Options = ["Pass", "Fail"];

const DEFAULT_DATA: TableRow[] = [
    { id: "1", column1: 1, column2: "T/A Vault", column3: "", column4: "", maxMarks: 10, column5: 0 },
    { id: "2", column1: 2, column2: "Rope", column3: "", column4: "", maxMarks: 13, column5: 0 },
    { id: "3", column1: 3, column2: "Chest Touch/ Heaving", column3: "", column4: "", maxMarks: 12, column5: 0 },
];

export default function Ipet1Form({ onMarksChange, activeSemester, ocId }: Ipet1FormProps) {
    const dispatch = useDispatch();
    const [isEditing, setIsEditing] = useState(false);

    // Get saved data from Redux
    const savedData = useSelector((state: RootState) =>
        state.physicalTraining.forms[ocId]?.[activeSemester]?.ipet1Data
    );

    const [tableData, setTableData] = useState<TableRow[]>(savedData || DEFAULT_DATA);

    // Load saved data when it changes
    useEffect(() => {
        if (savedData) {
            setTableData(savedData);
        }
    }, [savedData, activeSemester]);

    // Auto-save to Redux whenever data changes
    useEffect(() => {
        if (tableData && ocId) {
            dispatch(saveIpet1Data({
                ocId,
                semester: activeSemester,
                data: tableData
            }));
        }
    }, [tableData, ocId, activeSemester, dispatch]);

    const tableTotal = useMemo(() => {
        return tableData.reduce((sum, row) => sum + (row.column5 || 0), 0);
    }, [tableData]);

    const handleColumn3Change = (rowId: string, value: string) => {
        setTableData((prev) => prev.map((row) => (row.id === rowId ? { ...row, column3: value } : row)));
    };

    const handleColumn4Change = (rowId: string, value: string) => {
        setTableData((prev) => prev.map((row) => (row.id === rowId ? { ...row, column4: value } : row)));
    };

    const handleMaxMarksChange = (rowId: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        setTableData((prev) => prev.map((row) => (row.id === rowId ? { ...row, maxMarks: numValue } : row)));
    };

    const handleColumn5Change = (rowId: string, value: string) => {
        const row = tableData.find(r => r.id === rowId);
        if (!row) return;

        const numValue = parseFloat(value);

        if (value.trim() === "") {
            setTableData((prev) => prev.map((r) => (r.id === rowId ? { ...r, column5: 0 } : r)));
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

        setTableData((prev) => prev.map((r) => (r.id === rowId ? { ...r, column5: numValue } : r)));
    };

    useEffect(() => {
        onMarksChange(tableTotal);
    }, [tableTotal, onMarksChange]);

    const handleSave = () => {
        for (const row of tableData) {
            if (row.column5 > 0 && row.column5 > row.maxMarks) {
                toast.error(`Invalid marks for ${row.column2}. Marks must be between 0 and ${row.maxMarks}`);
                return;
            }
        }

        setIsEditing(false);
        toast.success("IPET data saved successfully");
    };

    const totalRow: TableRow = {
        id: "total",
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
                if (row.id === "total") {
                    return <span className="text-center block">{value}</span>;
                }
                return isEditing ? (
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) => handleMaxMarksChange(row.id, e.target.value)}
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
                if (row.id === "total") {
                    return <span className="text-center block">{value}</span>;
                }
                return isEditing ? (
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) => handleColumn5Change(row.id, e.target.value)}
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
                <h2 className="text-lg font-bold text-left text-gray-700">IPET (35 Marks)</h2>

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