"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
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
import MotivationAwards from "./MotivationAwards";
import Ipet1Form from "./Ipet1Form";
import Ipet2Form from "./Ipet2Form";
import GrandTotal from "./GrandTotal";
import HigherTests from "./HigherTests";
import Swimming from "./Swimming";
import Swimming1 from "./Swimming1";

import type { RootState } from "@/store";
import { savePPTData } from "@/store/slices/physicalTrainingSlice";

interface PhysicalTraining {
    id: string;
    column1: number | string;
    column2: string;
    column3: number;
    column4: string;
    column5: string;
    column6: number;
}

const column3Options = ["M1", "M2", "A1", "A2", "A3"];
const column4Options = ["Excellent", "Good", "Satisfied"];

const DEFAULT_SEMESTER_DATA: Record<string, PhysicalTraining[]> = {
    "I TERM": [
        { id: "1", column1: 1, column2: "1.6 Km Run", column3: 66, column4: "", column5: "", column6: 0 },
        { id: "2", column1: 2, column2: "Sprint 100m", column3: 28, column4: "", column5: "", column6: 0 },
        { id: "3", column1: 3, column2: "5 M Shuttle", column3: 32, column4: "", column5: "", column6: 0 },
        { id: "4", column1: 4, column2: "Sit Ups", column3: 24, column4: "", column5: "", column6: 0 },
        { id: "5", column1: "", column2: "Total", column3: 150, column4: "", column5: "", column6: 0 },
    ],
    "II TERM": [
        { id: "1", column1: 1, column2: "2.4 Km Run", column3: 53, column4: "", column5: "", column6: 0 },
        { id: "2", column1: 2, column2: "Chin Ups", column3: 26, column4: "", column5: "", column6: 0 },
        { id: "3", column1: 3, column2: "Toe Touch", column3: 26, column4: "", column5: "", column6: 0 },
        { id: "4", column1: 4, column2: "Sprint 100m", column3: 15, column4: "", column5: "", column6: 0 },
        { id: "5", column1: 5, column2: "5 M Shuttle", column3: 19, column4: "", column5: "", column6: 0 },
        { id: "6", column1: 6, column2: "Sit Ups", column3: 11, column4: "", column5: "", column6: 0 },
        { id: "7", column1: "", column2: "Total", column3: 150, column4: "", column5: "", column6: 0 },
    ],
    "III TERM": [
        { id: "1", column1: 1, column2: "2.4 Km Run", column3: 17, column4: "", column5: "", column6: 0 },
        { id: "2", column1: 2, column2: "Chin Ups", column3: 9, column4: "", column5: "", column6: 0 },
        { id: "3", column1: 3, column2: "Toe Touch", column3: 9, column4: "", column5: "", column6: 0 },
        { id: "4", column1: 4, column2: "Sprint 100m", column3: 5, column4: "", column5: "", column6: 0 },
        { id: "5", column1: 5, column2: "5 M Shuttle", column3: 6, column4: "", column5: "", column6: 0 },
        { id: "6", column1: 6, column2: "Sit Ups", column3: 4, column4: "", column5: "", column6: 0 },
        { id: "7", column1: "", column2: "Total", column3: 50, column4: "", column5: "", column6: 0 },
    ],
    "IV TERM": [
        { id: "1", column1: 1, column2: "2.4 Km Run", column3: 14, column4: "", column5: "", column6: 0 },
        { id: "2", column1: 2, column2: "Chin Ups", column3: 7, column4: "", column5: "", column6: 0 },
        { id: "3", column1: 3, column2: "Toe Touch", column3: 7, column4: "", column5: "", column6: 0 },
        { id: "4", column1: 4, column2: "Sprint 100m", column3: 4, column4: "", column5: "", column6: 0 },
        { id: "5", column1: 5, column2: "5 M Shuttle", column3: 5, column4: "", column5: "", column6: 0 },
        { id: "6", column1: 6, column2: "Sit Ups", column3: 3, column4: "", column5: "", column6: 0 },
        { id: "7", column1: "", column2: "Total", column3: 40, column4: "", column5: "", column6: 0 },
    ],
    "V TERM": [
        { id: "1", column1: 1, column2: "2.4 Km Run", column3: 14, column4: "", column5: "", column6: 0 },
        { id: "2", column1: 2, column2: "Chin Ups", column3: 7, column4: "", column5: "", column6: 0 },
        { id: "3", column1: 3, column2: "Toe Touch", column3: 7, column4: "", column5: "", column6: 0 },
        { id: "4", column1: 4, column2: "Sprint 100m", column3: 4, column4: "", column5: "", column6: 0 },
        { id: "5", column1: 5, column2: "5 M Shuttle", column3: 5, column4: "", column5: "", column6: 0 },
        { id: "6", column1: 6, column2: "Sit Ups", column3: 3, column4: "", column5: "", column6: 0 },
        { id: "7", column1: "", column2: "Total", column3: 40, column4: "", column5: "", column6: 0 },
    ],
    "VI TERM": [
        { id: "1", column1: 1, column2: "2.4 Km Run", column3: 14, column4: "", column5: "", column6: 0 },
        { id: "2", column1: 2, column2: "Chin Ups", column3: 7, column4: "", column5: "", column6: 0 },
        { id: "3", column1: 3, column2: "Toe Touch", column3: 7, column4: "", column5: "", column6: 0 },
        { id: "4", column1: 4, column2: "Sprint 100m", column3: 4, column4: "", column5: "", column6: 0 },
        { id: "5", column1: 5, column2: "5 M Shuttle", column3: 5, column4: "", column5: "", column6: 0 },
        { id: "6", column1: 6, column2: "Sit Ups", column3: 3, column4: "", column5: "", column6: 0 },
        { id: "7", column1: "", column2: "Total", column3: 40, column4: "", column5: "", column6: 0 },
    ],
};

interface PhysicalFormProps {
    ocId: string;
}

export default function PhysicalForm({ ocId }: PhysicalFormProps) {
    const dispatch = useDispatch();
    const [activeSemester, setActiveSemester] = useState("I TERM");
    const [isEditing, setIsEditing] = useState(false);
    const semesters = ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];

    // Get all saved data from Redux - but DON'T use it in effects
    const allSavedData = useSelector((state: RootState) =>
        state.physicalTraining.forms[ocId]
    );

    // Initialize state ONCE with Redux data or defaults
    const [semesterTableData, setSemesterTableData] = useState<Record<string, PhysicalTraining[]>>(() => {
        const initialData = { ...DEFAULT_SEMESTER_DATA };

        // Load all saved semesters from Redux on initial mount only
        if (allSavedData) {
            Object.keys(allSavedData).forEach((semester) => {
                const semesterData = allSavedData[semester]?.pptData;
                if (semesterData) {
                    initialData[semester] = semesterData;
                }
            });
        }

        return initialData;
    });

    // State to track marks from all child components
    const [childComponentMarks, setChildComponentMarks] = useState<Record<string, number>>({
        ipet1Form: 0,
        ipet2Form: 0,
        swimming1: 0,
        swimming: 0,
        higherTests: 0,
    });

    // Auto-save to Redux when data changes - with proper checks to prevent loops
    const lastSavedDataRef = useRef<string>("");

    useEffect(() => {
        const currentData = semesterTableData[activeSemester];
        if (!currentData || !ocId) return;

        // Create a stable string representation for comparison
        const dataString = JSON.stringify(currentData);

        // Only save if data actually changed
        if (dataString !== lastSavedDataRef.current) {
            lastSavedDataRef.current = dataString;

            const timeoutId = setTimeout(() => {
                dispatch(savePPTData({
                    ocId,
                    semester: activeSemester,
                    data: currentData
                }));
            }, 300);

            return () => clearTimeout(timeoutId);
        }
    }, [semesterTableData, activeSemester, ocId, dispatch]);

    // Auto-calc total marks (excluding "Total" row)
    const totalMarksObtained = useMemo(() => {
        const rows = semesterTableData[activeSemester] || [];
        const nonTotalRows = rows.slice(0, -1);
        return nonTotalRows.reduce((sum, row) => sum + (row.column6 || 0), 0);
    }, [semesterTableData, activeSemester]);

    // Calculate PPT Grand Total for the active semester
    const pptGrandTotal = useMemo(() => {
        return totalMarksObtained;
    }, [totalMarksObtained]);

    // Calculate the sum of all table totals
    const grandTotalMarks = useMemo(() => {
        const total =
            pptGrandTotal +
            (childComponentMarks.ipet1Form || 0) +
            (childComponentMarks.ipet2Form || 0) +
            (childComponentMarks.swimming1 || 0) +
            (childComponentMarks.swimming || 0) +
            (childComponentMarks.higherTests || 0);
        return total;
    }, [pptGrandTotal, childComponentMarks]);

    const handleColumn4Change = useCallback((rowId: string, value: string) => {
        setSemesterTableData((prev) => ({
            ...prev,
            [activeSemester]: prev[activeSemester].map((row) =>
                row.id === rowId ? { ...row, column4: value } : row
            ),
        }));
    }, [activeSemester]);

    const handleColumn5Change = useCallback((rowId: string, value: string) => {
        setSemesterTableData((prev) => ({
            ...prev,
            [activeSemester]: prev[activeSemester].map((row) =>
                row.id === rowId ? { ...row, column5: value } : row
            ),
        }));
    }, [activeSemester]);

    const handleColumn6Change = useCallback((rowId: string, value: string) => {
        setSemesterTableData((prev) => {
            const row = prev[activeSemester].find(r => r.id === rowId);
            if (!row) return prev;

            const numValue = parseFloat(value);

            // Allow empty values
            if (value.trim() === "") {
                return {
                    ...prev,
                    [activeSemester]: prev[activeSemester].map((r) =>
                        r.id === rowId ? { ...r, column6: 0 } : r
                    ),
                };
            }

            // Validate marks
            if (isNaN(numValue) || numValue < 0) {
                toast.error("Marks must be a valid positive number");
                return prev;
            }

            if (numValue > row.column3) {
                toast.error(`Marks scored cannot exceed maximum marks (${row.column3})`);
                return prev;
            }

            return {
                ...prev,
                [activeSemester]: prev[activeSemester].map((r) =>
                    r.id === rowId ? { ...r, column6: numValue } : r
                ),
            };
        });
    }, [activeSemester]);

    const handleEdit = useCallback(() => setIsEditing(true), []);

    const handleSave = useCallback(() => {
        // Validate all marks before saving
        const currentTableData = semesterTableData[activeSemester];
        const nonTotalRows = currentTableData.slice(0, -1);

        for (const row of nonTotalRows) {
            if (row.column6 > 0 && row.column6 > row.column3) {
                toast.error(`Invalid marks for ${row.column2}. Marks must be between 0 and ${row.column3}`);
                return;
            }
        }

        setIsEditing(false);
        toast.success("PPT data saved successfully");
    }, [semesterTableData, activeSemester]);

    const handleCancel = useCallback(() => setIsEditing(false), []);

    // Memoize all callback handlers to prevent child re-renders
    const handleIpet1FormMarks = useCallback((marks: number) => {
        setChildComponentMarks((prev) => {
            if (prev.ipet1Form === marks) return prev;
            return { ...prev, ipet1Form: marks };
        });
    }, []);

    const handleIpet2FormMarks = useCallback((marks: number) => {
        setChildComponentMarks((prev) => {
            if (prev.ipet2Form === marks) return prev;
            return { ...prev, ipet2Form: marks };
        });
    }, []);

    const handleSwimming1Marks = useCallback((marks: number) => {
        setChildComponentMarks((prev) => {
            if (prev.swimming1 === marks) return prev;
            return { ...prev, swimming1: marks };
        });
    }, []);

    const handleSwimmingMarks = useCallback((marks: number) => {
        setChildComponentMarks((prev) => {
            if (prev.swimming === marks) return prev;
            return { ...prev, swimming: marks };
        });
    }, []);

    const handleHigherTestsMarks = useCallback((marks: number) => {
        setChildComponentMarks((prev) => {
            if (prev.higherTests === marks) return prev;
            return { ...prev, higherTests: marks };
        });
    }, []);

    const pptMarks: Record<string, number> = {
        "I TERM": 150,
        "II TERM": 150,
        "III TERM": 50,
        "IV TERM": 40,
        "V TERM": 40,
        "VI TERM": 40,
    };

    const columns: TableColumn<PhysicalTraining>[] = useMemo(() => [
        {
            key: "column1",
            label: "S.No",
            render: (value, row, index) => {
                const isTotalRow = index === semesterTableData[activeSemester].length - 1;
                return isTotalRow ? "—" : value;
            }
        },
        {
            key: "column2",
            label: "Test",
            render: (value) => value
        },
        {
            key: "column3",
            label: "Max Marks",
            type: "number",
            render: (value, row, index) => {
                const isTotalRow = index === semesterTableData[activeSemester].length - 1;
                return (
                    <span className="text-center block">
                        {isTotalRow ? semesterTableData[activeSemester].slice(0, -1).reduce((sum, r) => sum + (r.column3 || 0), 0) : value}
                    </span>
                );
            }
        },
        {
            key: "column4",
            label: "Category",
            render: (value, row, index) => {
                const isTotalRow = index === semesterTableData[activeSemester].length - 1;
                if (isTotalRow) {
                    return <span className="text-center block">—</span>;
                }
                return (
                    <Select
                        value={value}
                        onValueChange={(val) => handleColumn4Change(row.id, val)}
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
            key: "column5",
            label: "Status",
            render: (value, row, index) => {
                const isTotalRow = index === semesterTableData[activeSemester].length - 1;
                if (isTotalRow) {
                    return <span className="text-center block">—</span>;
                }
                return (
                    <Select
                        value={value}
                        onValueChange={(val) => handleColumn5Change(row.id, val)}
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
            key: "column6",
            label: "Marks Scored",
            type: "number",
            render: (value, row, index) => {
                const isTotalRow = index === semesterTableData[activeSemester].length - 1;
                if (isTotalRow) {
                    return <span className="text-center block">{totalMarksObtained}</span>;
                }
                return isEditing ? (
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) => handleColumn6Change(row.id, e.target.value)}
                        placeholder="Enter marks"
                        className="w-full"
                    />
                ) : (
                    <span>{value || "-"}</span>
                );
            }
        }
    ], [semesterTableData, activeSemester, isEditing, totalMarksObtained, handleColumn4Change, handleColumn5Change, handleColumn6Change]);

    const config: TableConfig<PhysicalTraining> = useMemo(() => ({
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
    }), [columns]);

    return (
        <div className="mt-4 space-y-6">
            <Card className="p-6 rounded-2xl shadow-xl bg-white">
                <CardContent className="space-y-6">

                    {/* Semester Selector */}
                    <div className="flex justify-center mb-6 space-x-2">
                        {semesters.map((sem) => (
                            <button
                                key={sem}
                                onClick={() => setActiveSemester(sem)}
                                disabled={isEditing}
                                className={`px-4 py-2 rounded-t-lg font-medium ${activeSemester === sem ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                                    } ${isEditing ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {sem}
                            </button>
                        ))}
                    </div>

                    <h2 className="text-lg font-bold text-left text-gray-700">
                        PPT ({pptMarks[activeSemester]} marks)
                    </h2>

                    {/* Physical Training Table */}
                    <div>
                        <div className="rounded-lg">
                            <UniversalTable<PhysicalTraining>
                                data={semesterTableData[activeSemester]}
                                config={config}
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 justify-center mt-6">
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

                        {activeSemester === "III TERM" && (
                            <>
                                <Ipet1Form
                                    key="ipet1-III"
                                    onMarksChange={handleIpet1FormMarks}
                                    activeSemester={activeSemester}
                                    ocId={ocId}
                                />
                                <Swimming
                                    key="swimming-III"
                                    onMarksChange={handleSwimmingMarks}
                                    activeSemester={activeSemester}
                                    ocId={ocId}
                                />
                                <HigherTests
                                    key="higher-tests-III"
                                    onMarksChange={handleHigherTestsMarks}
                                    activeSemester={activeSemester}
                                    ocId={ocId}
                                />
                            </>
                        )}

                        {(activeSemester === "IV TERM" ||
                            activeSemester === "V TERM" ||
                            activeSemester === "VI TERM") && (
                                <>
                                    <Ipet2Form
                                        key={`ipet2-${activeSemester}`}
                                        onMarksChange={handleIpet2FormMarks}
                                        activeSemester={activeSemester}
                                        ocId={ocId}
                                    />

                                    <Swimming1
                                        key={`swimming1-${activeSemester}`}
                                        onMarksChange={handleSwimming1Marks}
                                        activeSemester={activeSemester}
                                        ocId={ocId}
                                    />

                                    <HigherTests
                                        key={`higher-tests-${activeSemester}`}
                                        onMarksChange={handleHigherTestsMarks}
                                        activeSemester={activeSemester}
                                        ocId={ocId}
                                    />
                                </>
                            )}

                        <MotivationAwards
                            key={`motivation-${activeSemester}`}
                            activeSemester={activeSemester}
                            ocId={ocId}
                        />

                        <GrandTotal grandTotalMarks={grandTotalMarks} />
                    </div>

                    {/* Auto-save indicator */}
                    <p className="text-sm text-muted-foreground text-center mt-2">
                        * Changes are automatically saved
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}