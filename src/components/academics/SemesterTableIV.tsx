"use client";

import React from "react";
import AcademicTable, { AcademicRow } from "./AcademicTable";

const list = [
    "Control Systems",
    "Mil Art - I",
    "Mil Science",
    "Mil Wpn Technology",
    "Theory of Machines-II",
    "Machine Design-I",
    "Hydraulic Mach / Micro Electro Mechanical Sys",
    "Thermal Engg / Analog Comm",
    "Computer Org & Programming",
    "Manufacturing Tech / Microprocessor",
] as const;

export default function SemesterTableIV() {
    const rows: AcademicRow[] = list.map((s) => ({ subject: s, exam: "Theory", credit: "" }));
    return <AcademicTable idKey="term4"  rows={rows} totalCredits="25M/22L" title="Term IV" />;
}
