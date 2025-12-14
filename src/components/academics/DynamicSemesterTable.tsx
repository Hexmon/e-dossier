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
    const { loading, fetchOfferings } = useOfferings(courseId);
    const [rows, setRows] = useState<AcademicRow[]>([]);
    const [totalCredits, setTotalCredits] = useState<string | number>("");

    useEffect(() => {
        const loadOfferings = async () => {
            // Fetch all offerings for this course
            const allOfferings = await fetchOfferings() as any[];

            if (!Array.isArray(allOfferings)) {
                console.error("Expected array from fetchOfferings, got:", allOfferings);
                return;
            }

            console.log("All offerings:", allOfferings);

            // Filter offerings by semester and ensure they have the subject property
            const semesterOfferings = allOfferings.filter(
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

            // Calculate total credits
            const theoryTotal = semesterOfferings.reduce(
                (sum, offering) =>
                    sum + (offering.includeTheory ? offering.theoryCredits : 0),
                0
            );
            const practicalTotal = semesterOfferings.reduce(
                (sum, offering) =>
                    sum + (offering.includePractical ? offering.practicalCredits : 0),
                0
            );

            setTotalCredits(theoryTotal + practicalTotal);
        };

        if (courseId) {
            loadOfferings();
        }
    }, [courseId, semester, fetchOfferings]);

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