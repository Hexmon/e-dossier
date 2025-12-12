"use client";

import React from "react";
import AcademicTable, { AcademicRow } from "./AcademicTable";

const list = [
    "Non-Conventional Energy Sources",
    "Electrical Machines - II",
    "Mil Art - I",
    "Military Science",
    "Military Weapon Technology",
    "Strength of Material",
    "Engg Material Science / Circuit Theory",
    "Applied Thermodynamics",
    "Fluid Mechanics",
    "Theory of Machines-I",
] as const;

export default function SemesterTableIII() {
    const rows: AcademicRow[] = list.map((s) => ({ subject: s, exam: "Theory", credit: "" }));
    return <AcademicTable idKey="term3" rows={rows} totalCredits="22M/20L" title="Term III" />;
}
