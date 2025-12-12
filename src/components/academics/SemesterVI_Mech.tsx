"use client";

import React from "react";
import AcademicTable, { AcademicRow } from "./AcademicTable";

const list = [
    "Proj",
    "Mil Science",
    "Mil Wpn Technology",
    "Def Studies",
    "Instrumental & Metrology / Digital Sig Processing",
    "Refrigeration & Air-Conditioning / Digital Comm",
    "CAD/CAM / Artificial Intelligence",
    "Advance Automobile Engg",
    "Mech Vibration / Microwave Engg",
] as const;

export default function SemesterVI_Mech() {
    const rows: AcademicRow[] = list.map((s) => ({ subject: s, exam: "Theory", credit: "" }));
    return <AcademicTable idKey="term6_mech" rows={rows} totalCredits="21M/24L" title="Term VI — Mech/Elect" />;
}
