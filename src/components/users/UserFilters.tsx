"use client";

import React from "react";
import { Input } from "@/components/ui/input";

interface UserFiltersProps {
    search: string;
    onSearch: (val: string) => void;
    statusFilter: string;
    onStatusChange: (val: string) => void;
    roleFilter: string;
    onRoleChange: (val: string) => void;
}

export default function UserFilters({
    search,
    onSearch,
    statusFilter,
    onStatusChange,
    roleFilter,
    onRoleChange,
}: UserFiltersProps) {
    return (
        <div className="grid grid-cols-3 gap-3">
            <Input
                placeholder="Search name / username / email…"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
            />

            <select
                className="border rounded px-2 py-2"
                value={statusFilter}
                onChange={(e) => onStatusChange(e.target.value)}
            >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
            </select>

            <select
                className="border rounded px-2 py-2"
                value={roleFilter}
                onChange={(e) => onRoleChange(e.target.value)}
            >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="manager">Manager</option>
            </select>
        </div>
    );
}