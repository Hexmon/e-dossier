"use client";

import React from "react";
import AcademicTable, { AcademicRow } from "./AcademicTable";

const subjects = [
    "Electrical Technology",
    "Engg Physics-I",
    "Engg Chemistry",
    "Engg Maths - I",
    "Engg Drawing",
    "Computer Science & IT",
    "English",
    "Mil Art - II",
    "Info Technology",
] as const;

export default function SemesterTableI(){
    const rows: AcademicRow[] = subjects.map((s, idx) => ({
        subject: s,
        exam: "Theory",
        credit: [2, 4, 3, 5, "-", 1, 1, "-", 1][idx] ?? "",
    }));

    return <AcademicTable idKey="term1" rows={rows} totalCredits="25" title="Term I" />;
}
