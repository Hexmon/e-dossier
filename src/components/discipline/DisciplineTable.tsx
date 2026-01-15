"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UniversalTable, TableColumn, TableAction, TableConfig } from "@/components/layout/TableLayout";
import type { DisciplineRow as HookRow } from "@/hooks/useDisciplineRecords";

interface Props {
    rows: HookRow[] | undefined;
    loading: boolean;
    onEditSave: (id: string, payload: Partial<HookRow>) => Promise<void> | void;
    onDelete: (row: HookRow) => Promise<void> | void;
}

/**
 * Table component:
 * - shows fallback "-" for empty values
 * - allows inline editing of all fields
 * - computes values via props (cumulative is already computed by hook)
 */
export default function DisciplineTable({ rows, loading, onEditSave, onDelete }: Props) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<HookRow> | null>(null);

    const changeEdit = <K extends keyof HookRow>(key: K, value: HookRow[K]) => {
        setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    };

    const saveEdit = async () => {
        if (!editingId || !editForm) return;
        await onEditSave(editingId, editForm);
        setEditingId(null);
        setEditForm(null);
    };

    const startEdit = (row: HookRow) => {
        setEditingId(row.id ?? null);
        setEditForm({ ...row });
    };

    const columns: TableColumn<HookRow>[] = [
        {
            key: "serialNo",
            label: "S.No",
            render: (value) => value || "-"
        },
        {
            key: "dateOfOffence",
            label: "Date",
            type: "date",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        type="date"
                        value={String(editForm?.dateOfOffence ?? (value === "-" || !value ? "" : value))}
                        onChange={(e) => changeEdit("dateOfOffence", e.target.value as any)}
                    />
                ) : value || "-";
            }
        },
        {
            key: "offence",
            label: "Offence",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={String(editForm?.offence ?? value)}
                        onChange={(e) => changeEdit("offence", e.target.value as any)}
                    />
                ) : value || "-";
            }
        },
        {
            key: "punishmentAwarded",
            label: "Punishment",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={String(editForm?.punishmentAwarded ?? value)}
                        onChange={(e) => changeEdit("punishmentAwarded", e.target.value as any)}
                    />
                ) : value || "-";
            }
        },
        {
            key: "dateOfAward",
            label: "Date Awarded",
            type: "date",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        type="date"
                        value={String(editForm?.dateOfAward ?? (value === "-" || !value ? "" : value))}
                        onChange={(e) => changeEdit("dateOfAward", e.target.value as any)}
                    />
                ) : value || "-";
            }
        },
        {
            key: "byWhomAwarded",
            label: "By Whom",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={String(editForm?.byWhomAwarded ?? value)}
                        onChange={(e) => changeEdit("byWhomAwarded", e.target.value as any)}
                    />
                ) : value || "-";
            }
        },
        {
            key: "negativePts",
            label: "Negative Pts",
            type: "number",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        type="number"
                        value={String(editForm?.negativePts ?? value)}
                        onChange={(e) => changeEdit("negativePts", e.target.value as any)}
                    />
                ) : value || "0";
            }
        },
        {
            key: "cumulative",
            label: "Cumulative",
            render: (value) => value ?? "0"
        }
    ];

    const actions: TableAction<HookRow>[] = [
        {
            key: "edit-cancel",
            label: editingId ? "Cancel" : "Edit",
            variant: editingId ? "outline" : "outline",
            size: "sm",
            handler: (row) => {
                if (editingId === row.id) {
                    setEditingId(null);
                    setEditForm(null);
                } else {
                    startEdit(row);
                }
            }
        },
        {
            key: "save-delete",
            label: editingId ? "Save" : "Delete",
            variant: editingId ? "default" : "destructive",
            size: "sm",
            handler: async (row) => {
                if (editingId === row.id) {
                    await saveEdit();
                } else {
                    await onDelete(row);
                }
            }
        }
    ];

    const config: TableConfig<HookRow> = {
        columns,
        actions,
        features: {
            sorting: false,
            filtering: false,
            pagination: false,
            selection: false,
            search: false
        },
        styling: {
            compact: false,
            bordered: true,
            striped: false,
            hover: false
        },
        emptyState: {
            message: "No data submitted yet for this semester."
        },
        loading
    };

    return (
        <div className="mb-6">
            <UniversalTable<HookRow>
                data={rows || []}
                config={config}
            />
        </div>
    );
}
