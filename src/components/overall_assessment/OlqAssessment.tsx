"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UniversalTable, TableColumn, TableConfig } from "@/components/layout/TableLayout";
import Appointments from "./Appointments";
import Relegations from "./Relegations";
import Withdrawal from "./Withdrawal";
import OverallPerformance from "./OverallPerformance";
import { toast } from "sonner";
import type { RootState } from "@/store";
import { saveOlqTableData, saveObservations } from "@/store/slices/overallAssessmentSlice";
import { listOlqRecords } from "@/app/lib/api/olqApi";
import { ApiClientError } from "@/app/lib/apiClient";

interface Row {
    factor: string;
    column1: number;
    column2: number;
    column3: number;
    column4: number;
    column5: number;
    remarks: string;
}

const DEFAULT_TABLE_DATA: Row[] = [
    { factor: "1st Term", column1: 0, column2: 0, column3: 0, column4: 0, column5: 0, remarks: "" },
    { factor: "2nd Term", column1: 0, column2: 0, column3: 0, column4: 0, column5: 0, remarks: "" },
    { factor: "3rd Term", column1: 0, column2: 0, column3: 0, column4: 0, column5: 0, remarks: "" },
    { factor: "4th Term", column1: 0, column2: 0, column3: 0, column4: 0, column5: 0, remarks: "" },
    { factor: "5th Term", column1: 0, column2: 0, column3: 0, column4: 0, column5: 0, remarks: "" },
    { factor: "6th Term", column1: 0, column2: 0, column3: 0, column4: 0, column5: 0, remarks: "" },
];

type OlqCategory = {
    code?: string | null;
    title?: string | null;
    subtitles?: Array<{ marksScored?: number | string | null }>;
};

const normalizeCategoryName = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]+/g, "");

const getCategoryColumn = (category: OlqCategory): "column1" | "column2" | "column3" | "column4" | null => {
    const key = normalizeCategoryName(`${category.code ?? ""} ${category.title ?? ""}`);

    if (key.includes("PLGORG") || key.includes("PLGANDORG") || key.includes("PLANNINGORGANISATION") || key.includes("PLANNINGORGANIZATION")) {
        return "column1";
    }
    if (key.includes("SOCIALADJUSTMENT")) {
        return "column2";
    }
    if (key.includes("SOCIALEFFECTIVENESS")) {
        return "column3";
    }
    if (key.includes("DYNAMIC")) {
        return "column4";
    }

    return null;
};

const sumCategoryMarks = (category: OlqCategory) =>
    (category.subtitles ?? []).reduce((sum, subtitle) => sum + (Number(subtitle.marksScored) || 0), 0);

const mergeRemarks = (rows: Row[], savedRows?: Row[]) => {
    if (!savedRows?.length) return rows;

    const remarksByFactor = new Map(savedRows.map((row) => [row.factor, row.remarks ?? ""]));
    return rows.map((row) => ({
        ...row,
        remarks: remarksByFactor.get(row.factor) ?? row.remarks,
    }));
};

const rowsEqual = (a: Row[], b: Row[]) =>
    a.length === b.length && a.every((row, index) => {
        const other = b[index];
        return other
            && row.factor === other.factor
            && row.column1 === other.column1
            && row.column2 === other.column2
            && row.column3 === other.column3
            && row.column4 === other.column4
            && row.column5 === other.column5
            && row.remarks === other.remarks;
    });

export default function OlqAssessment() {
    const params = useParams();
    const paramId = params?.id || params?.ocId;
    const ocId = Array.isArray(paramId) ? paramId[0] : paramId ?? "";

    const dispatch = useDispatch();
    const [isEditingTable, setIsEditingTable] = useState(false);
    const [isEditingObservations, setIsEditingObservations] = useState(false);

    // Get saved data from Redux
    const savedData = useSelector((state: RootState) =>
        state.overallAssessment.forms[ocId]
    );

    // Initialize state from Redux or defaults
    const [tableData, setTableData] = useState<Row[]>(() =>
        mergeRemarks(DEFAULT_TABLE_DATA, savedData?.olqTableData)
    );
    const [observations, setObservations] = useState(() =>
        savedData?.observations || ""
    );
    const [hasLoadedOlqTotals, setHasLoadedOlqTotals] = useState(false);
    const [isLoadingOlqTotals, setIsLoadingOlqTotals] = useState(false);

    // Debounce refs
    const tableDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const observationsDebounceRef = useRef<NodeJS.Timeout | null>(null);

    // Load saved data when ocId changes
    useEffect(() => {
        setTableData(prev => {
            const next = mergeRemarks(prev, savedData?.olqTableData);
            return rowsEqual(prev, next) ? prev : next;
        });
        setObservations(savedData?.observations || "");
    }, [ocId, savedData]);

    useEffect(() => {
        if (!ocId) return;

        let mounted = true;
        setHasLoadedOlqTotals(false);
        setIsLoadingOlqTotals(true);

        const fetchSavedOlqTotals = async () => {
            try {
                const semesterSheets = await Promise.all(
                    DEFAULT_TABLE_DATA.map(async (_row, index) => {
                        try {
                            const response = await listOlqRecords(ocId, index + 1) as { data?: { categories?: OlqCategory[] } };
                            return response.data ?? null;
                        } catch (error) {
                            if (error instanceof ApiClientError && error.status === 404) {
                                return null;
                            }
                            throw error;
                        }
                    })
                );

                if (!mounted) return;

                setTableData(prev => {
                    const rows = DEFAULT_TABLE_DATA.map((defaultRow, index) => {
                        const nextRow: Row = { ...defaultRow, remarks: prev[index]?.remarks ?? defaultRow.remarks };
                        const categories = semesterSheets[index]?.categories ?? [];

                        categories.forEach((category) => {
                            const column = getCategoryColumn(category);
                            if (!column) return;
                            nextRow[column] += sumCategoryMarks(category);
                        });

                        return nextRow;
                    });

                    return rowsEqual(prev, rows) ? prev : rows;
                });
                setHasLoadedOlqTotals(true);
            } catch (error) {
                console.error(error);
                if (mounted) {
                    toast.error("Failed to load saved OLQ assessment data");
                }
            } finally {
                if (mounted) {
                    setIsLoadingOlqTotals(false);
                }
            }
        };

        fetchSavedOlqTotals();

        return () => {
            mounted = false;
        };
    }, [ocId]);

    // Auto-save table data with debounce
    useEffect(() => {
        if (!ocId || !hasLoadedOlqTotals) return;

        if (tableDebounceRef.current) {
            clearTimeout(tableDebounceRef.current);
        }

        tableDebounceRef.current = setTimeout(() => {
            dispatch(saveOlqTableData({ ocId, data: tableData }));
        }, 500);

        return () => {
            if (tableDebounceRef.current) {
                clearTimeout(tableDebounceRef.current);
            }
        };
    }, [tableData, ocId, dispatch, hasLoadedOlqTotals]);

    // Auto-save observations with debounce
    useEffect(() => {
        if (!ocId) return;

        if (observationsDebounceRef.current) {
            clearTimeout(observationsDebounceRef.current);
        }

        observationsDebounceRef.current = setTimeout(() => {
            dispatch(saveObservations({ ocId, data: observations }));
        }, 500);

        return () => {
            if (observationsDebounceRef.current) {
                clearTimeout(observationsDebounceRef.current);
            }
        };
    }, [observations, ocId, dispatch]);

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
        toast.success("OLQ Assessment saved successfully");
    };
    const handleCancelTable = () => setIsEditingTable(false);

    const handleEditObservations = () => setIsEditingObservations(true);
    const handleSaveObservations = () => {
        setIsEditingObservations(false);
        toast.success("Observations saved successfully");
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
                return <span>{value || "-"}</span>;
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
                return <span>{value || "-"}</span>;
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
                return <span>{value || "-"}</span>;
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
                return <span>{value || "-"}</span>;
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
            <Card className="rounded-2xl shadow-xl bg-card">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-center text-primary">
                        Overall Assessment
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {(isEditingTable || isEditingObservations) && (
                        <div className="text-xs text-muted-foreground text-center">
                            ✓ Changes are saved automatically
                        </div>
                    )}

                    <div>
                        <h2 className="p-2 text-lg font-bold text-left text-foreground underline">OLQ Assessment</h2>
                        {isLoadingOlqTotals && (
                            <p className="px-2 pb-2 text-sm text-muted-foreground">Loading saved OLQ totals...</p>
                        )}
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
                        <h2 className="p-2 text-lg text-left font-bold text-foreground underline">Observations on Moral Conduct</h2>
                        <textarea
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            placeholder="Enter observations"
                            className="w-full h-32 border border-border rounded-lg px-3 py-2"
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

                    <Appointments ocId={ocId} />
                    <Relegations ocId={ocId} />
                    <Withdrawal ocId={ocId} />
                    <OverallPerformance ocId={ocId} />
                </CardContent>
            </Card>
        </div>
    );
}
