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
    semesterFilter: string;
    onSemesterChange: (val: string) => void;
}

export const OC_FILTERS_GRID_CLASS = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6";
const OC_FILTER_SELECT_CLASS = "h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

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
    semesterFilter,
    onSemesterChange,
}: FiltersProps) {
    return (
        <div className={OC_FILTERS_GRID_CLASS}>
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
                aria-label="Filter by branch"
                className={OC_FILTER_SELECT_CLASS}
                value={branchFilter}
                onChange={(e) => onBranchChange(e.target.value)}
            >
                <option value="">All Branches</option>
                <option value="O">O</option>
                <option value="E">E</option>
                <option value="M">M</option>
            </select>

            <select
                aria-label="Filter by OC status"
                className={OC_FILTER_SELECT_CLASS}
                value={statusFilter}
                onChange={(e) => onStatusChange(e.target.value)}
            >
                <option value="">All Status</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DELEGATED">DELEGATED</option>
                <option value="WITHDRAWN">WITHDRAWN</option>
                <option value="PASSED_OUT">PASSED_OUT</option>
            </select>

            <select
                aria-label="Filter by semester"
                className={OC_FILTER_SELECT_CLASS}
                value={semesterFilter}
                onChange={(e) => onSemesterChange(e.target.value)}
            >
                <option value="">All Semesters</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Semester 3</option>
                <option value="4">Semester 4</option>
                <option value="5">Semester 5</option>
                <option value="6">Semester 6</option>
            </select>
        </div>
    );
}
