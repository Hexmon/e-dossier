"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UniversalTable, TableColumn, TableAction, TableConfig } from "@/components/layout/TableLayout";
import type { AdminDisciplineRow } from "@/hooks/useDisciplineRecordsAdmin";
import { Card } from "../ui/card";

interface Props {
    rows: AdminDisciplineRow[];
    loading: boolean;
    onEdit?: (row: AdminDisciplineRow) => void;
    onDelete?: (row: AdminDisciplineRow) => void;
    isAdmin: boolean;
}

export default function DisciplineRecordsTable({ rows, loading, onEdit, onDelete, isAdmin }: Props) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredRows = rows.filter(row =>
        row.ocName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.ocNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.punishment.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const columns: TableColumn<AdminDisciplineRow>[] = [
        {
            key: "ocName",
            label: "OC Name",
            render: (value) => value || "-"
        },
        {
            key: "ocNo",
            label: "TES No",
            render: (value) => value || "-"
        },
        {
            key: "punishment",
            label: "Punishment",
            render: (value) => value || "-"
        },
        {
            key: "points",
            label: "Points",
            render: (value) => value || "0"
        }
    ];

    const actions: TableAction<AdminDisciplineRow>[] = [];

    if (isAdmin && onEdit) {
        actions.push({
            key: "edit",
            label: "Edit",
            variant: "outline",
            size: "sm",
            handler: (row) => onEdit(row)
        });
    }

    if (isAdmin && onDelete) {
        actions.push({
            key: "delete",
            label: "Delete",
            variant: "destructive",
            size: "sm",
            handler: (row) => onDelete(row)
        });
    }

    const config: TableConfig<AdminDisciplineRow> = {
        columns,
        actions,
        features: {
            sorting: true,
            filtering: false,
            pagination: true,
            selection: false,
            search: false
        },
        styling: {
            compact: true,
            bordered: true,
            striped: true,
            hover: true
        },
        emptyState: {
            message: "No discipline records found"
        },
        loading
    };

    return (
        <Card className="p-6">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Discipline Records</h3>
                    <Input
                        placeholder="Search by OC name, TES no, or punishment..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-md"
                    />
                </div>
                <UniversalTable<AdminDisciplineRow>
                    data={filteredRows}
                    config={config}
                />
            </div>
        </Card>
    );
}
