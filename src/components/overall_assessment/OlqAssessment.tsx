"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Appointments from "./Appointments";
import Relegations from "./Relegations";
import Withdrawal from "./Withdrawal";
import OverallPerformance from "./OverallPerformance";

interface Row {
    factor: string;
    column1: number;
    column2: number;
    column3: number;
    column4: number;
    column5: number;
    remarks: string;
}

export default function OlqAssessment() {
    const [isEditingTable, setIsEditingTable] = useState(false);
    const [isEditingObservations, setIsEditingObservations] = useState(false);
    const [observations, setObservations] = useState("");

    const [tableData, setTableData] = useState<Row[]>([
        { factor: "1st Term", column1: 0, column2: 0, column3: 0, column4: 0, column5: 0, remarks: "" },
        { factor: "2nd Term", column1: 0, column2: 0, column3: 0, column4: 0, column5: 0, remarks: "" },
        { factor: "3rd Term", column1: 0, column2: 0, column3: 0, column4: 0, column5: 0, remarks: "" },
        { factor: "4th Term", column1: 0, column2: 0, column3: 0, column4: 0, column5: 0, remarks: "" },
        { factor: "5th Term", column1: 0, column2: 0, column3: 0, column4: 0, column5: 0, remarks: "" },
        { factor: "6th Term", column1: 0, column2: 0, column3: 0, column4: 0, column5: 0, remarks: "" },
    ]);

    const handleChange = (factor: string, key: keyof Row, value: string) => {
        setTableData(prev =>
            prev.map(r => {
                if (r.factor === factor) {
                    if (key === "column1" || key === "column2" || key === "column3" || key === "column4" || key === "column5") {
                        return { ...r, [key]: parseFloat(value) || 0 };
                    }
                    return { ...r, [key]: value };
                }
                return r;
            }),
        );
    };

    const calculateRowTotal = (row: Row) => {
        return row.column1 + row.column2 + row.column3 + row.column4;
    };

    const calculateGrandTotal = () => {
        return tableData.reduce((sum, row) => sum + calculateRowTotal(row), 0);
    };

    const handleEditTable = () => setIsEditingTable(true);
    const handleSaveTable = () => {
        setIsEditingTable(false);
        console.log("OLQ Assessment Table saved:", tableData);
    };
    const handleCancelTable = () => setIsEditingTable(false);

    const handleEditObservations = () => setIsEditingObservations(true);
    const handleSaveObservations = () => {
        setIsEditingObservations(false);
        console.log("Observations on Moral Conduct saved:", observations);
    };
    const handleCancelObservations = () => setIsEditingObservations(false);

    return (
        <div className="space-y-6 p-6">
            <Card className="rounded-2xl shadow-xl bg-white">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-center text-blue-600">
                        Overall Assessment
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="overflow-x-auto">
                        <h2 className="p-2 text-lg font-bold text-left text-gray-700 underline">OLQ Assessment</h2>
                        <table className="w-full">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="border border-gray-300 px-4 py-2 text-left">Factor</th>
                                    <th className="border border-gray-300 px-4 py-2 text-left">Planning & Organisation</th>
                                    <th className="border border-gray-300 px-4 py-2 text-left">Social Adjustment</th>
                                    <th className="border border-gray-300 px-4 py-2 text-left">Social Effectiveness</th>
                                    <th className="border border-gray-300 px-4 py-2 text-left">Dynamic</th>
                                    <th className="border border-gray-300 px-4 py-2 text-left">Total</th>
                                    <th className="border border-gray-300 px-4 py-2 text-left">Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.map(row => {
                                    const { factor, column1, column2, column3, column4, remarks } = row;
                                    const rowTotal = calculateRowTotal(row);
                                    return (
                                        <tr key={factor} className="hover:bg-gray-50 border-b border-gray-300">
                                            <td className="border border-gray-300 px-4 py-2">{factor}</td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                {isEditingTable ? (
                                                    <Input
                                                        type="number"
                                                        value={column1}
                                                        onChange={(e) => handleChange(factor, "column1", e.target.value)}
                                                        placeholder="0"
                                                        className="w-full"
                                                    />
                                                ) : (
                                                    <span>{column1 || "-"}</span>
                                                )}
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                {isEditingTable ? (
                                                    <Input
                                                        type="number"
                                                        value={column2}
                                                        onChange={(e) => handleChange(factor, "column2", e.target.value)}
                                                        placeholder="0"
                                                        className="w-full"
                                                    />
                                                ) : (
                                                    <span>{column2 || "-"}</span>
                                                )}
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                {isEditingTable ? (
                                                    <Input
                                                        type="number"
                                                        value={column3}
                                                        onChange={(e) => handleChange(factor, "column3", e.target.value)}
                                                        placeholder="0"
                                                        className="w-full"
                                                    />
                                                ) : (
                                                    <span>{column3 || "-"}</span>
                                                )}
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                {isEditingTable ? (
                                                    <Input
                                                        type="number"
                                                        value={column4}
                                                        onChange={(e) => handleChange(factor, "column4", e.target.value)}
                                                        placeholder="0"
                                                        className="w-full"
                                                    />
                                                ) : (
                                                    <span>{column4 || "-"}</span>
                                                )}
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2 text-center font-semibold">
                                                {rowTotal}
                                            </td>
                                            <td className="border border-gray-300 px-4 py-2">
                                                {isEditingTable ? (
                                                    <Input
                                                        type="text"
                                                        value={remarks}
                                                        onChange={(e) => handleChange(factor, "remarks", e.target.value)}
                                                        placeholder="Enter remarks"
                                                        className="w-full"
                                                    />
                                                ) : (
                                                    <span>{remarks || "-"}</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                <tr className="bg-gray-100 font-semibold">
                                    <td className="border border-gray-300 px-4 py-2">Total</td>
                                    <td className="border border-gray-300 px-4 py-2 text-center">
                                        {tableData.reduce((sum, r) => sum + (r.column1 || 0), 0)}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2 text-center">
                                        {tableData.reduce((sum, r) => sum + (r.column2 || 0), 0)}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2 text-center">
                                        {tableData.reduce((sum, r) => sum + (r.column3 || 0), 0)}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2 text-center">
                                        {tableData.reduce((sum, r) => sum + (r.column4 || 0), 0)}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2 text-center">
                                        {calculateGrandTotal()}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2 text-center">
                                        <span>{"-"}</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* OLQ Assessment Edit Buttons */}
                    <div className="flex gap-3 justify-center mt-4">
                        {isEditingTable ? (
                            <>
                                <Button variant="outline" onClick={handleCancelTable}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSaveTable}>Save</Button>
                            </>
                        ) : (
                            <Button onClick={handleEditTable}>Edit</Button>
                        )}
                    </div>

                    <div className="mt-4">
                        <h2 className="p-2 text-lg text-left font-bold text-gray-700 underline">Observations on Moral Conduct</h2>
                        <textarea
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            placeholder="Enter observations"
                            className="w-full h-32 border border-gray-300 rounded-lg px-3 py-2"
                            disabled={!isEditingObservations}
                        />
                    </div>

                    {/* Observations on Moral Conduct Edit Buttons */}
                    <div className="flex gap-3 justify-center mt-4">
                        {isEditingObservations ? (
                            <>
                                <Button variant="outline" onClick={handleCancelObservations}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSaveObservations}>Save</Button>
                            </>
                        ) : (
                            <Button onClick={handleEditObservations}>Edit</Button>
                        )}
                    </div>

                    <Appointments />
                    <Relegations />
                    <Withdrawal />
                    <OverallPerformance />
                </CardContent>
            </Card>
        </div>
    );
}
