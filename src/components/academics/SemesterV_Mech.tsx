"use client";

import React from "react";
import AcademicTable, { AcademicRow } from "./AcademicTable";

const list = [
    "Tech Seminar & Industrial Vis",
    "Robotics",
    "Automobile Engg",
    "Mil Science",
    "Mil Wpn Technology",
    "Def Studies",
    "Automation in Manufacturing",
    "Machine Design-II / Computer Networking",
    "Machine Science / Integrated Circuits",
    "Engg Heat Transfer / Microcontroller",
    "Fine Element Method / Advance Microcontrollers",
] as const;

export default function SemesterV_Mech() {
    const rows: AcademicRow[] = list.map((s) => ({ subject: s, exam: "Theory", credit: "" }));
    return <AcademicTable idKey="term5_mech" rows={rows} totalCredits="20M/22L" title="Term V — Mech/Elect" />;
}
