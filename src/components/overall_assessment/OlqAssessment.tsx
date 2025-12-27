"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UniversalTable, TableColumn, TableConfig } from "@/components/layout/TableLayout";
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

    // Add total row to data
    const totalRow: Row = {
        factor: "Total",
        column1: tableData.reduce((sum, r) => sum + (r.column1 || 0), 0),
        column2: tableData.reduce((sum, r) => sum + (r.column2 || 0), 0),
        column3: tableData.reduce((sum, r) => sum + (r.column3 || 0), 0),
        column4: tableData.reduce((sum, r) => sum + (r.column4 || 0), 0),
        column5: calculateGrandTotal(),
        remarks: "-"
    };

    const displayData = [...tableData, totalRow];

    const columns: TableColumn<Row>[] = [
        {
            key: "factor",
            label: "Factor",
            render: (value) => value
        },
        {
            key: "column1",
            label: "Planning & Organisation",
            type: "number",
            render: (value, row) => {
                const isTotalRow = row.factor === "Total";
                if (isTotalRow) {
                    return <span className="text-center block">{value}</span>;
                }
                return isEditingTable ? (
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) => handleChange(row.factor, "column1", e.target.value)}
                        placeholder="0"
                        className="w-full"
                    />
                ) : (
                    <span>{value || "-"}</span>
                );
            }
        },
        {
            key: "column2",
            label: "Social Adjustment",
            type: "number",
            render: (value, row) => {
                const isTotalRow = row.factor === "Total";
                if (isTotalRow) {
                    return <span className="text-center block">{value}</span>;
                }
                return isEditingTable ? (
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) => handleChange(row.factor, "column2", e.target.value)}
                        placeholder="0"
                        className="w-full"
                    />
                ) : (
                    <span>{value || "-"}</span>
                );
            }
        },
        {
            key: "column3",
            label: "Social Effectiveness",
            type: "number",
            render: (value, row) => {
                const isTotalRow = row.factor === "Total";
                if (isTotalRow) {
                    return <span className="text-center block">{value}</span>;
                }
                return isEditingTable ? (
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) => handleChange(row.factor, "column3", e.target.value)}
                        placeholder="0"
                        className="w-full"
                    />
                ) : (
                    <span>{value || "-"}</span>
                );
            }
        },
        {
            key: "column4",
            label: "Dynamic",
            type: "number",
            render: (value, row) => {
                const isTotalRow = row.factor === "Total";
                if (isTotalRow) {
                    return <span className="text-center block">{value}</span>;
                }
                return isEditingTable ? (
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) => handleChange(row.factor, "column4", e.target.value)}
                        placeholder="0"
                        className="w-full"
                    />
                ) : (
                    <span>{value || "-"}</span>
                );
            }
        },
        {
            key: "column5",
            label: "Total",
            type: "number",
            render: (value, row) => {
                const isTotalRow = row.factor === "Total";
                const rowTotal = isTotalRow ? value : calculateRowTotal(row);
                return <span className="text-center block font-semibold">{rowTotal}</span>;
            }
        },
        {
            key: "remarks",
            label: "Remarks",
            render: (value, row) => {
                const isTotalRow = row.factor === "Total";
                if (isTotalRow) {
                    return <span className="text-center block">-</span>;
                }
                return isEditingTable ? (
                    <Input
                        type="text"
                        value={value}
                        onChange={(e) => handleChange(row.factor, "remarks", e.target.value)}
                        placeholder="Enter remarks"
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
        <div className="space-y-6 p-6">
            <Card className="rounded-2xl shadow-xl bg-white">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-center text-blue-600">
                        Overall Assessment
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h2 className="p-2 text-lg font-bold text-left text-gray-700 underline">OLQ Assessment</h2>
                        <UniversalTable<Row>
                            data={displayData}
                            config={config}
                        />
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
