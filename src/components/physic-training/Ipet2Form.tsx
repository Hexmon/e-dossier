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

interface TableRow {
    id: string;
    column1: number;
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
const column4Options = ["Excellent", "Good", "Satisfied"];

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
        const numValue = parseFloat(value) || 0;
        setTableData((prev) =>
            prev.map((row) => (row.id === rowId ? { ...row, column5: numValue } : row))
        );
    };

    

    useEffect(() => {
        onMarksChange(totalMarksScored);
    }, [totalMarksScored, onMarksChange]);

    return (
        <div className="mt-3 space-y-6">
            <CardContent className="space-y-6">

                <h2 className="text-lg font-bold text-left text-gray-700">IPET (50 Marks)</h2>

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
                            {tableData.map((row) => {
                                const { id, column1, column2, maxMarks, column3, column4, column5 } = row;
                                return (
                                    <tr key={id} className="hover:bg-gray-50 border-b border-gray-300">
                                        <td className="border border-gray-300 px-4 py-2">{column1}</td>
                                        <td className="border border-gray-300 px-4 py-2">{column2}</td>

                                        {/* Max Marks */}
                                        <td className="border border-gray-300 px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    value={maxMarks}
                                                    onChange={(e) => handleMaxMarksChange(id, e.target.value)}
                                                />
                                            ) : (
                                                <span>{maxMarks}</span>
                                            )}
                                        </td>

                                        {/* Category */}
                                        <td className="border border-gray-300 px-4 py-2">
                                            <Select
                                                value={column3}
                                                onValueChange={(value) => handleColumn3Change(id, value)}
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
                                    </td>

                                    {/* Status */}
                                    <td className="border border-gray-300 px-4 py-2">
                                        <Select
                                            value={column4}
                                            onValueChange={(value) => handleColumn4Change(id, value)}
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
                                    </td>

                                    {/* Marks Scored */}
                                    <td className="border border-gray-300 px-4 py-2">
                                        {isEditing ? (
                                            <Input
                                                type="number"
                                                value={column5}
                                                onChange={(e) => handleColumn5Change(id, e.target.value)}
                                                className="w-full"
                                            />
                                        ) : (
                                            <span>{column5 || "-"}</span>
                                        )}
                                    </td>
                                </tr>
                                );
                            })}

                            {/* ---------- TOTAL ROW (Same functionality as PhysicalForm) ---------- */}
                            <tr className="bg-gray-100 font-bold">
                                <td className="border border-gray-300 px-4 py-2 text-center"></td>
                                <td className="border border-gray-300 px-4 py-2 text-left">Total</td>

                                {/* Total Max Marks */}
                                <td className="border border-gray-300 px-4 py-2 text-left">
                                    {totalMaxMarks}
                                </td>

                                {/* Hide Category */}
                                <td className="border border-gray-300 px-4 py-2 text-center">—</td>

                                {/* Hide Status */}
                                <td className="border border-gray-300 px-4 py-2 text-center">—</td>

                                {/* Total Marks Scored */}
                                <td className="border border-gray-300 px-4 py-2 text-left">
                                    {totalMarksScored}
                                </td>
                            </tr>

                        </tbody>
                    </table>
                </div>

                {/* Edit Buttons */}
                <div className="flex gap-3 justify-center mt-4">
                    {isEditing ? (
                        <>
                            <Button variant="outline" onClick={() => setIsEditing(false)}>
                                Cancel
                            </Button>
                            <Button onClick={() => setIsEditing(false)}>Save</Button>
                        </>
                    ) : (
                        <Button onClick={() => setIsEditing(true)}>Edit</Button>
                    )}
                </div>

            </CardContent>
        </div>
    );
}
