"use client";


import React, { useState, useMemo, useCallback } from "react";
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
import MotivationAwards from "./MotivationAwards";
import Ipet1Form from "./Ipet1Form";
import Ipet2Form from "./Ipet2Form";
import GrandTotal from "./GrandTotal";
import HigherTests from "./HigherTests";
import Swimming from "./Swimming";
import Swimming1 from "./Swimming1";


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


export default function PhysicalForm() {
    const [activeSemester, setActiveSemester] = useState("I TERM");
    const [isEditing, setIsEditing] = useState(false);
    const semesters = ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];

    const [semesterTableData, setSemesterTableData] = useState<Record<string, PhysicalTraining[]>>({
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
    });


    // State to track marks from all child components
    const [childComponentMarks, setChildComponentMarks] = useState<Record<string, number>>({
        ipet1Form: 0,
        ipet2Form: 0,
        swimming1: 0,
        swimming: 0,
        higherTests: 0,
    });


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


    const handleColumn4Change = (rowId: string, value: string) => {
        setSemesterTableData((prev) => ({
            ...prev,
            [activeSemester]: prev[activeSemester].map((row) =>
                row.id === rowId ? { ...row, column4: value } : row
            ),
        }));
    };


    const handleColumn5Change = (rowId: string, value: string) => {
        setSemesterTableData((prev) => ({
            ...prev,
            [activeSemester]: prev[activeSemester].map((row) =>
                row.id === rowId ? { ...row, column5: value } : row
            ),
        }));
    };


    const handleColumn6Change = (rowId: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        setSemesterTableData((prev) => ({
            ...prev,
            [activeSemester]: prev[activeSemester].map((row) =>
                row.id === rowId ? { ...row, column6: numValue } : row
            ),
        }));
    };


    const handleEdit = () => setIsEditing(true);
    const handleSave = () => {
        setIsEditing(false);
        console.log("Data saved:", semesterTableData[activeSemester]);
    };
    const handleCancel = () => setIsEditing(false);

    const handleIpet1FormMarks = useCallback((marks: number) => {
        setChildComponentMarks((prev) => ({
            ...prev,
            ipet1Form: marks,
        }));
    }, []);


    const handleIpet2FormMarks = useCallback((marks: number) => {
        setChildComponentMarks((prev) => ({
            ...prev,
            ipet2Form: marks,
        }));
    }, []);

    const handleSwimming1Marks = useCallback((marks: number) => {
        setChildComponentMarks((prev) => ({
            ...prev,
            swimming1: marks,
        }));
    }, []);

    const handleSwimmingMarks = useCallback((marks: number) => {
        setChildComponentMarks((prev) => ({
            ...prev,
            swimming: marks,
        }));
    }, []);

    const handleHigherTestsMarks = useCallback((marks: number) => {
        setChildComponentMarks((prev) => ({
            ...prev,
            higherTests: marks,
        }));
    }, []);


    const pptMarks: Record<string, number> = {
        "I TERM": 150,
        "II TERM": 150,
        "III TERM": 50,
        "IV TERM": 40,
        "V TERM": 40,
        "VI TERM": 40,
    };


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
                        <div className="overflow-x-auto rounded-lg">
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
                                    {semesterTableData[activeSemester].map((row, index, arr) => {
                                        const { id, column1, column2, column3, column4, column5, column6 } = row;
                                        const isTotalRow = index === arr.length - 1;


                                        return (
                                            <tr key={id} className={isTotalRow ? "bg-gray-100 font-semibold" : "hover:bg-gray-50 border-b border-gray-300"}>
                                                <td className="border border-gray-300 px-4 py-2">
                                                    {isTotalRow ? "—" : column1}
                                                </td>


                                                <td className="border border-gray-300 px-4 py-2">
                                                    {column2}
                                                </td>


                                                <td className="border border-gray-300 px-4 py-2 text-center">
                                                    {isTotalRow ? semesterTableData[activeSemester].slice(0, -1).reduce((sum, r) => sum + (r.column3 || 0), 0) : column3}
                                                </td>


                                                {!isTotalRow ? (
                                                    <>
                                                        <td className="border border-gray-300 px-4 py-2">
                                                            <Select
                                                                value={column4}
                                                                onValueChange={(value) =>
                                                                    handleColumn4Change(id, value)
                                                                }
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


                                                        <td className="border border-gray-300 px-4 py-2">
                                                            <Select
                                                                value={column5}
                                                                onValueChange={(value) =>
                                                                    handleColumn5Change(id, value)
                                                                }
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
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="border border-gray-300 px-4 py-2 text-center">—</td>
                                                        <td className="border border-gray-300 px-4 py-2 text-center">—</td>
                                                    </>
                                                )}


                                                <td className="border border-gray-300 px-4 py-2 text-center">
                                                    {isTotalRow ? totalMarksObtained : isEditing ? (
                                                        <Input
                                                            type="number"
                                                            value={column6}
                                                            onChange={(e) =>
                                                                handleColumn6Change(id, e.target.value)
                                                            }
                                                            placeholder="Enter marks"
                                                            className="w-full"
                                                        />
                                                    ) : (
                                                        <span>{column6 || "-"}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
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


                        <MotivationAwards activeSemester={activeSemester} />


                        {activeSemester === "III TERM" && (
                            <>
                                <Ipet1Form
                                    onMarksChange={handleIpet1FormMarks}
                                    activeSemester={activeSemester}
                                />
                                <Swimming
                                    onMarksChange={handleSwimmingMarks}
                                    activeSemester={activeSemester} 
                                    />
                                <HigherTests
                                    onMarksChange={handleHigherTestsMarks}
                                    activeSemester={activeSemester}
                                />
                            </>
                        )}


                        {(activeSemester === "IV TERM" ||
                            activeSemester === "V TERM" ||
                            activeSemester === "VI TERM") && (
                                <>
                                    <Ipet2Form
                                        onMarksChange={handleIpet2FormMarks}
                                        activeSemester={activeSemester}
                                    />

                                    <Swimming1
                                        onMarksChange={handleSwimming1Marks}
                                        activeSemester={activeSemester}
                                    />

                                    <HigherTests
                                        onMarksChange={handleHigherTestsMarks}
                                        activeSemester={activeSemester}
                                    />
                                </>
                            )}


                        <GrandTotal grandTotalMarks={grandTotalMarks} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
