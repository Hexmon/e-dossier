"use client";

import React from "react";
import AcademicTable, { AcademicRow } from "./AcademicTable";

export default function SemesterTableII(){
    const rows: AcademicRow[] = [
        { subject: "Workshop Practice", exam: "Theory", credit: 1 },
        { subject: "Maths - II", exam: "Theory", credit: 5 },
        { subject: "Electrical Machines - I", exam: "Theory", credit: 3 },
        { subject: "Basic Electronics", exam: "Theory", credit: 3 },
        { subject: "Pollution & Renewable Energy Sources", exam: "Theory", credit: 2 },
        { subject: "Applied Mechanics", exam: "Theory", credit: 1 },
        { subject: "Thermodynamics", exam: "Theory", credit: 4 },
        { subject: "Mil Art - I", exam: "Theory", credit: "-" },
        { subject: "Mil Art - II", exam: "Theory", credit: 1 },
    ];

    return <AcademicTable idKey="term2"  rows={rows} totalCredits="25" title="Term II" />;
}
