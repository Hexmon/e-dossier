"use client";
import React, { useMemo } from "react";
import { useOfferings } from "@/hooks/useOfferings";
import { Offering } from "@/app/lib/api/offeringsApi";
import AcademicTable, { AcademicRow } from "./AcademicTable";

interface DynamicSemesterTableProps {
    ocId: string;
    courseId: string;
    semester: number;
    canEdit?: boolean;
}

export default function DynamicSemesterTable({
    ocId,
    courseId,
    semester,
    canEdit = false,
}: DynamicSemesterTableProps) {
    const { loading, offerings } = useOfferings(courseId);
    const { rows, totalCredits } = useMemo(() => {
        if (!courseId || loading) {
            return { rows: [] as AcademicRow[], totalCredits: "" as string | number };
        }

        const semesterOfferings = offerings.filter((offering: Offering) => {
            const hasSubject = offering.subject !== undefined || offering.subjectName !== undefined;
            return offering.semester === semester && hasSubject;
        });

        if (semesterOfferings.length === 0) {
            return { rows: [] as AcademicRow[], totalCredits: 0 };
        }

        const transformedRows: AcademicRow[] = semesterOfferings.map((offering: Offering) => ({
            subjectId: offering.subject?.id || "",
            subject: offering.subject?.name || offering.subjectName || "Unknown Subject",
            exam: offering.includeTheory ? "Theory" : undefined,
            credit: offering.includeTheory ? offering.theoryCredits : "-",
            practicalExam: offering.includePractical ? "Practical" : null,
            practicalCredit: offering.includePractical ? offering.practicalCredits : null,
        }));

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

        return { rows: transformedRows, totalCredits: theoryTotal + practicalTotal };
    }, [courseId, loading, offerings, semester]);

    if (loading) {
        return <div className="p-4 text-center">Loading semester data...</div>;
    }

    if (rows.length === 0) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                No subjects are configured for Semester {semester} in the current course offerings.
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
            canEdit={canEdit}
        />
    );
}
