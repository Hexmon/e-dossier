// components/OCFilters.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import SearchableSelect from "@/components/ui/searchable-select";

type CourseLike = { id: string; code?: string; title?: string };
type PlatoonLike = { id: string; key?: string; name?: string };

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

            <SearchableSelect
                value={courseFilter}
                onValueChange={onCourseChange}
                options={courses.map(({ id, code, title }) => ({
                    value: id,
                    label: code && title ? `${code} - ${title}` : code ?? title ?? id,
                }))}
                placeholder="All Courses"
                searchPlaceholder="Search course..."
                allOptionLabel="All Courses"
                emptyLabel="No course found"
            />

            <SearchableSelect
                value={platoonFilter}
                onValueChange={onPlatoonChange}
                options={platoons.map(({ id, key, name }) => ({
                    value: id,
                    label: key && name ? `${key} - ${name}` : name ?? key ?? id,
                }))}
                placeholder="All Platoons"
                searchPlaceholder="Search platoon..."
                allOptionLabel="All Platoons"
                emptyLabel="No platoon found"
            />

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
