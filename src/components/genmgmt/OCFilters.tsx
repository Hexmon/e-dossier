// components/OCFilters.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";

type CourseLike = { id: string; code?: string; title?: string };
type PlatoonLike = { id: string; name?: string };

interface FiltersProps {
    search: string;
    onSearch: (val: string) => void;
    courseFilter: string;
    onCourseChange: (val: string) => void;
    courses: CourseLike[];
    platoonFilter: string;
    onPlatoonChange: (val: string) => void;
    platoons: PlatoonLike[];
    branchFilter: string;
    onBranchChange: (val: string) => void;
    statusFilter: string;
    onStatusChange: (val: string) => void;
}

export default function OCFilters({
    search,
    onSearch,
    courseFilter,
    onCourseChange,
    courses,
    platoonFilter,
    onPlatoonChange,
    platoons,
    branchFilter,
    onBranchChange,
    statusFilter,
    onStatusChange,
}: FiltersProps) {
    return (
        <div className="grid grid-cols-5 gap-3">
            <Input
                placeholder="Search name / TES no..."
                value={search}
                onChange={(e) => onSearch(e.target.value)}
            />

            <select
                className="border rounded px-2 py-2"
                value={courseFilter}
                onChange={(e) => onCourseChange(e.target.value)}
            >
                <option value="">All Courses</option>
                {courses.map(({ id, code, title }) => (
                    <option key={id} value={id}>
                        {code ?? title ?? id}
                    </option>
                ))}
            </select>

            <select
                className="border rounded px-2 py-2"
                value={platoonFilter}
                onChange={(e) => onPlatoonChange(e.target.value)}
            >
                <option value="">All Platoons</option>
                {platoons.map(({ id, name }) => (
                    <option key={id} value={id}>
                        {name ?? id}
                    </option>
                ))}
            </select>

            <select
                className="border rounded px-2 py-2"
                value={branchFilter}
                onChange={(e) => onBranchChange(e.target.value)}
            >
                <option value="">All Branches</option>
                <option value="O">O</option>
                <option value="E">E</option>
                <option value="M">M</option>
            </select>

            <select
                className="border rounded px-2 py-2"
                value={statusFilter}
                onChange={(e) => onStatusChange(e.target.value)}
            >
                <option value="">All Status</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DELEGATED">DELEGATED</option>
                <option value="WITHDRAWN">WITHDRAWN</option>
                <option value="PASSED_OUT">PASSED_OUT</option>
            </select>
        </div>
    );
}