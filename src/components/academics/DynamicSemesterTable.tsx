"use client";
import React, { useEffect, useState } from "react";
import { useOfferings } from "@/hooks/useOfferings";
import { Offering } from "@/app/lib/api/offeringsApi";
import AcademicTable, { AcademicRow } from "./AcademicTable";

interface DynamicSemesterTableProps {
    ocId: string;
    courseId: string;
    semester: number;
}

export default function DynamicSemesterTable({
    ocId,
    courseId,
    semester
}: DynamicSemesterTableProps) {
    const { loading, offerings } = useOfferings(courseId);
    const [rows, setRows] = useState<AcademicRow[]>([]);
    const [totalCredits, setTotalCredits] = useState<string | number>("");

    useEffect(() => {
        const loadOfferings = () => {
            if (!Array.isArray(offerings)) {
                console.error("Expected array from offerings, got:", offerings);
                return;
            }

            console.log("All offerings:", offerings);

            // Filter offerings by semester and ensure they have the subject property
            const semesterOfferings = offerings.filter(
                (offering: Offering) => {
                    const hasSubject = offering.subject !== undefined || offering.subjectName !== undefined;
                    return offering.semester === semester && hasSubject;
                }
            );

            console.log(`Semester ${semester} offerings:`, semesterOfferings);

            if (semesterOfferings.length === 0) {
                console.warn(`No offerings found for semester ${semester}`);
                setRows([]);
                setTotalCredits(0);
                return;
            }

            // Transform offerings into AcademicRow format
            const transformedRows: AcademicRow[] = semesterOfferings.map((offering: Offering) => ({
                subjectId: offering.subject?.id || "",
                subject: offering.subject?.name || offering.subjectName || "Unknown Subject",
                exam: offering.includeTheory ? "Theory" : undefined,
                credit: offering.includeTheory ? offering.theoryCredits : "-",
                practicalExam: offering.includePractical ? "Practical" : null,
                practicalCredit: offering.includePractical ? offering.practicalCredits : null,
            }));

            console.log("Transformed rows:", transformedRows);
            setRows(transformedRows);

            // Calculate total credits with null checks
            const theoryTotal = semesterOfferings.reduce(
                (sum, offering) =>
                    sum + (offering.includeTheory && offering.theoryCredits ? offering.theoryCredits : 0),
                0
            );
            const practicalTotal = semesterOfferings.reduce(
                (sum, offering) =>
                    sum + (offering.includePractical && offering.practicalCredits ? offering.practicalCredits : 0),
                0
            );

            setTotalCredits(theoryTotal + practicalTotal);
        };

        if (courseId && offerings.length > 0) {
            loadOfferings();
        } else if (courseId && !loading && offerings.length === 0) {
            // Handle empty state
            setRows([]);
            setTotalCredits(0);
        }
    }, [courseId, semester, offerings, loading]);

    if (loading) {
        return <div className="p-4 text-center">Loading semester data...</div>;
    }

    if (rows.length === 0) {
        return (
            <div className="p-4 text-center text-gray-500">
                No subjects found for Semester {semester}
            </div>
        );
    }

    return (
        <AcademicTable
            ocId={ocId}
            semester={semester}
            rows={rows}
            totalCredits={totalCredits}
            title={`Semester ${semester}`}
        />
    );
}