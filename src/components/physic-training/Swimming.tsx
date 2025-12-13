"use client";

import React, { useState, useMemo, useEffect } from "react";
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
import { toast } from "sonner";

interface Row {
    id: string;
    column1: number;
    column2: string;
    column3: string;
    column4: string;
    maxMarks: number;
    column5: number;
}

interface SwimmingProps {
    onMarksChange: (marks: number) => void;
    activeSemester: string;
}

const column3Options = ["M1", "M2", "A1", "A2", "A3"];
const column4Options = ["Pass", "Fail"];

export default function Swimming({ onMarksChange, activeSemester }: SwimmingProps) {
    const [isEditing, setIsEditing] = useState(false);

    const [tableData, setTableData] = useState<Row[]>([
        { id: "1", column1: 1, column2: "25 meter", column3: "", column4: "", maxMarks: 15, column5: 0 },
        { id: "2", column1: 2, column2: "Jump", column3: "", column4: "", maxMarks: 20, column5: 0 },
    ]);

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

    return (
        <CardContent className="space-y-4">
            <h2 className="text-lg font-bold text-left text-gray-700">
                Swimming ({activeSemester === "III TERM" ? 35 : 30} marks)
            </h2>
            <div className="overflow-x-auto border border-gray-300 rounded-lg">
                <table className="w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border border-gray-300 px-4 py-2 text-left">S.No</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Test</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Max Marks</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Category</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Marks Scored</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map(row => {
                            const { id, column1, column2, maxMarks, column3, column4, column5 } = row;
                            return (
                                <tr key={id} className="hover:bg-gray-50 border-b border-gray-300">
                                    <td className="border border-gray-300 px-4 py-2">{column1}</td>
                                    <td className="border border-gray-300 px-4 py-2">{column2}</td>
                                    <td className="border border-gray-300 px-4 py-2">
                                        {isEditing ? (
                                            <Input
                                                type="number"
                                                value={maxMarks}
                                                onChange={(e) => handleChange(id, "maxMarks", e.target.value)}
                                                placeholder="Max"
                                                className="w-full"
                                            />
                                        ) : (
                                            <span>{maxMarks || "-"}</span>
                                        )}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2">
                                        <Select
                                            value={column3}
                                            onValueChange={(v) => handleChange(id, "column3", v)}
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
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2">
                                        <Select
                                            value={column4}
                                            onValueChange={(v) => handleChange(id, "column4", v)}
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
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2">
                                        {isEditing ? (
                                            <Input
                                                type="number"
                                                value={column5}
                                                onChange={(e) => handleChange(id, "column5", e.target.value)}
                                                placeholder="Enter marks"
                                                className="w-full"
                                            />
                                        ) : (
                                            <span>{column5 || "-"}</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        <tr className="bg-gray-100 font-semibold">
                            <td className="border border-gray-300 px-4 py-2">—</td>
                            <td className="border border-gray-300 px-4 py-2">Total</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                                {tableData.reduce((sum, r) => sum + (r.maxMarks || 0), 0)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">—</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">—</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{tableTotal}</td>
                        </tr>
                    </tbody>
                </table>
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
        </CardContent>
    );
}
