"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
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
import IpetForm from "./IpetForm";
import GrandTotal from "./GrandTotal";
import HigherTests from "./HigherTests";
import Swimming from "./Swimming";

import { usePhysicalTraining } from "@/hooks/usePhysicalTraining";

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

// Semester to API semester mapping (1-based index)
const semesterToApiSemester: Record<string, number> = {
    "I TERM": 1,
    "II TERM": 2,
    "III TERM": 3,
    "IV TERM": 4,
    "V TERM": 5,
    "VI TERM": 6,
};



interface PhysicalFormProps {
    ocId: string;
}

export default function PhysicalForm({ ocId }: PhysicalFormProps) {
    const [activeSemester, setActiveSemester] = useState("I TERM");
    const [isEditing, setIsEditing] = useState(false);
    const semesters = ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];

    // Use the physical training hook to manage API calls
    const { scores: apiScores, loading, error: ptError, fetchScores, saveScores, updateScores, template } = usePhysicalTraining(ocId);

    // State to track marks from all child components
    const [childComponentMarks, setChildComponentMarks] = useState<Record<string, number>>({
        ipet1Form: 0,
        ipet2Form: 0,
        swimming1: 0,
        swimming: 0,
        higherTests: 0,
    });

    // Build local table data from API only - no hardcoded or Redux fallback
    const [semesterTableData, setSemesterTableData] = useState<Record<string, PhysicalTraining[]>>(() => {
        const data: Record<string, PhysicalTraining[]> = {};

        // Initialize with empty arrays for each semester - data will be populated from API
        semesters.forEach((semester) => {
            data[semester] = [];
        });

        return data;
    });

    // When API scores or template arrive, update state
    useEffect(() => {
        if (template && template.length > 0) {
            // Populate table with template data
            setSemesterTableData((prev) => {
                const updated = { ...prev };
                const semesterNum = semesterToApiSemester[activeSemester];
                const semesterTemplate = template.filter(t => t.semester === semesterNum);

                if (semesterTemplate.length > 0) {
                    const rows = semesterTemplate.map((task, index) => ({
                        id: task.ptTaskScoreId,
                        column1: index + 1 as number | string,
                        column2: task.taskTitle,
                        column3: task.maxMarks,
                        column4: "",
                        column5: "",
                        column6: 0,
                    }));

                    const totalMaxMarks = rows.reduce((sum, row) => sum + row.column3, 0);
                    rows.push({
                        id: `${rows.length + 1}`,
                        column1: "" as number | string,
                        column2: "Total",
                        column3: totalMaxMarks,
                        column4: "",
                        column5: "",
                        column6: 0,
                    });

                    updated[activeSemester] = rows;
                }

                return updated;
            });
        } else if (apiScores && apiScores.length > 0) {
            // Update existing scores
            setSemesterTableData((prev) => {
                const updated = { ...prev };

                const updatedRows = updated[activeSemester].map((row) => {
                    if (row.column2 === "Total") return row;

                    const apiScore = apiScores.find(
                        (score) => score.ptTaskScoreId === row.id
                    );

                    if (apiScore) {
                        return {
                            ...row,
                            column6: apiScore.marksScored || 0,
                        };
                    }

                    return row;
                });

                return {
                    ...updated,
                    [activeSemester]: updatedRows,
                };
            });
        }
    }, [apiScores, template, activeSemester]);

    // Fetch scores when semester changes
    useEffect(() => {
        const semesterNum = semesterToApiSemester[activeSemester];
        if (semesterNum) {
            fetchScores(semesterNum);
        }
    }, [activeSemester, fetchScores]);



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

    const handleSave = useCallback(async () => {
        // Validate all marks before saving
        const currentTableData = semesterTableData[activeSemester];
        const nonTotalRows = currentTableData.slice(0, -1);

        for (const row of nonTotalRows) {
            if (row.column6 > 0 && row.column6 > row.column3) {
                toast.error(`Invalid marks for ${row.column2}. Marks must be between 0 and ${row.column3}`);
                return;
            }
        }

        // Prepare scores for API - only include rows with valid UUID ptTaskScoreId
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const scoresForApi = nonTotalRows
            .filter((row) => uuidRegex.test(row.id))
            .map((row) => ({
                ptTaskScoreId: row.id,
                marksScored: row.column6 || 0,
            }));

        // Call API to save - use POST for new scores, PATCH for updates
        const semesterNum = semesterToApiSemester[activeSemester];
        if (scoresForApi.length > 0) {
            // Update existing scores
            await updateScores(semesterNum, scoresForApi);
        } else {
            // No existing scores to update - this shouldn't happen with current logic
            toast.error("No valid scores to save. Please ensure scores are loaded from the server.");
            return;
        }

        setIsEditing(false);
        toast.success("PPT data saved successfully");
    }, [semesterTableData, activeSemester, updateScores]);

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
                        PPT ({semesterTableData[activeSemester].slice(0, -1).reduce((sum, row) => sum + (row.column3 || 0), 0)} marks)
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
                                <IpetForm
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
                                    <IpetForm
                                        key={`ipet2-${activeSemester}`}
                                        onMarksChange={handleIpet2FormMarks}
                                        activeSemester={activeSemester}
                                        ocId={ocId}
                                    />

                                    <Swimming
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
                            activeSemester={activeSemester}
                            ocId={ocId}
                        />

                        <GrandTotal grandTotalMarks={grandTotalMarks} />
                    </div>


                </CardContent>
            </Card>
        </div>
    );
}