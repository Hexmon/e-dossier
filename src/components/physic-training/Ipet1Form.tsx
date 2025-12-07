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
}

const column3Options = ["M1", "M2", "A1", "A2", "A3"];
const column4Options = ["Excellent", "Good", "Satisfied"];

export default function Ipet1Form({ onMarksChange, activeSemester }: Ipet1FormProps) {
    const [isEditing, setIsEditing] = useState(false);

    const [tableData, setTableData] = useState<TableRow[]>([
        { id: "1", column1: 1, column2: "T/A Vault", column3: "", column4: "", maxMarks: 10, column5: 0 },
        { id: "2", column1: 2, column2: "Rope", column3: "", column4: "", maxMarks: 13, column5: 0 },
        { id: "3", column1: 3, column2: "Chest Touch/ Heaving", column3: "", column4: "", maxMarks: 12, column5: 0 },
    ]);

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
        const numValue = parseFloat(value) || 0;
        setTableData((prev) => prev.map((row) => (row.id === rowId ? { ...row, column5: numValue } : row)));
    };

    useEffect(() => {
        onMarksChange(tableTotal);
    }, [tableTotal, onMarksChange]);

    return (
        <div className="mt-3 space-y-6">
            <CardContent className="space-y-6">
                <h2 className="text-lg font-bold text-left text-gray-700">IPET (35 Marks)</h2>

                <div className="overflow-x-auto border border-gray-300 rounded-lg">
                    <table className="w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="border border-gray-300 px-4 py-2 text-left">S.No</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">Test</th>

                                {/* MOVED HERE */}
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

                                        {/* MOVED MAX MARKS CELL */}
                                        <td className="border border-gray-300 px-4 py-2 ">
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    value={maxMarks}
                                                    onChange={(e) => handleMaxMarksChange(id, e.target.value)}
                                                    placeholder="Max"
                                                />
                                            ) : (
                                                <span>{maxMarks || "-"}</span>
                                            )}
                                        </td>

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
                                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </td>

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
                                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </td>

                                        <td className="border border-gray-300 px-4 py-2 ">
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    value={column5}
                                                    onChange={(e) => handleColumn5Change(id, e.target.value)}
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

                                {/* MAX MARKS TOTAL — SAME POSITION */}
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

                <div className="flex gap-3 justify-center mt-4">
                    {isEditing ? (
                        <>
                            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
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
