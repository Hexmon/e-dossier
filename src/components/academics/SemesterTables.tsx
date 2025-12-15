"use client";

import React from "react";
import DynamicSemesterTable from "./DynamicSemesterTable";

interface SemesterTableProps {
    ocId: string;
    courseId: string;
}

export function SemesterTableI({ ocId, courseId }: SemesterTableProps) {
    return <DynamicSemesterTable ocId={ocId} courseId={courseId} semester={1} />;
}

export function SemesterTableII({ ocId, courseId }: SemesterTableProps) {
    return <DynamicSemesterTable ocId={ocId} courseId={courseId} semester={2} />;
}

export function SemesterTableIII({ ocId, courseId }: SemesterTableProps) {
    return <DynamicSemesterTable ocId={ocId} courseId={courseId} semester={3} />;
}

export function SemesterTableIV({ ocId, courseId }: SemesterTableProps) {
    return <DynamicSemesterTable ocId={ocId} courseId={courseId} semester={4} />;
}

export function SemesterTableV_Mech({ ocId, courseId }: SemesterTableProps) {
    return <DynamicSemesterTable ocId={ocId} courseId={courseId} semester={5} />;
}

export function SemesterTableVI_Mech({ ocId, courseId }: SemesterTableProps) {
    return <DynamicSemesterTable ocId={ocId} courseId={courseId} semester={6} />;
}