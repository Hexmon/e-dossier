"use client";

import React from "react";
import DynamicSemesterTable from "./DynamicSemesterTable";

interface SemesterTableProps {
    ocId: string;
    courseId: string;
    canEdit?: boolean;
}

export function SemesterTableI({ ocId, courseId, canEdit = false }: SemesterTableProps) {
    return <DynamicSemesterTable ocId={ocId} courseId={courseId} semester={1} canEdit={canEdit} />;
}

export function SemesterTableII({ ocId, courseId, canEdit = false }: SemesterTableProps) {
    return <DynamicSemesterTable ocId={ocId} courseId={courseId} semester={2} canEdit={canEdit} />;
}

export function SemesterTableIII({ ocId, courseId, canEdit = false }: SemesterTableProps) {
    return <DynamicSemesterTable ocId={ocId} courseId={courseId} semester={3} canEdit={canEdit} />;
}

export function SemesterTableIV({ ocId, courseId, canEdit = false }: SemesterTableProps) {
    return <DynamicSemesterTable ocId={ocId} courseId={courseId} semester={4} canEdit={canEdit} />;
}

export function SemesterTableV_Mech({ ocId, courseId, canEdit = false }: SemesterTableProps) {
    return <DynamicSemesterTable ocId={ocId} courseId={courseId} semester={5} canEdit={canEdit} />;
}

export function SemesterTableVI_Mech({ ocId, courseId, canEdit = false }: SemesterTableProps) {
    return <DynamicSemesterTable ocId={ocId} courseId={courseId} semester={6} canEdit={canEdit} />;
}
