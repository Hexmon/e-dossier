"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UniversalTable, TableColumn, TableAction, TableConfig } from "@/components/layout/TableLayout";
import type { CounsellingRow } from "@/types/counselling";

interface Props {
    rows: CounsellingRow[];
    loading: boolean;
    onEditSave: (id: string, payload: Partial<{ reason: string; warningType: string; date: string; warningBy: string }>) => Promise<void> | void;
    onDelete: (id: string) => Promise<void> | void;
}

export default function CounsellingTable({ rows, loading, onEditSave, onDelete }: Props) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<CounsellingRow> | null>(null);

    const startEdit = (row: CounsellingRow) => {
        setEditingId(row.id ?? null);
        setEditForm({
            id: row.id,
            reason: row.reason,
            warningType: row.warningType,
            date: row.date,
            warningBy: row.warningBy,
        });
    };

    const changeEdit = <K extends keyof CounsellingRow>(key: K, value: CounsellingRow[K]) => {
        setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    };

    const saveEdit = async () => {
        if (!editingId || !editForm) return;
        const { id, reason = "", warningType = "", date = "", warningBy = "" } = editForm;
        await onEditSave(editingId, { reason, warningType, date, warningBy });
        setEditingId(null);
        setEditForm(null);
    };

    const columns: TableColumn<CounsellingRow>[] = [
        {
            key: "serialNo",
            label: "S No",
            render: (value, row, index) => value || String(index + 1)
        },
        {
            key: "reason",
            label: "Reason (Attach copy)",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.reason ?? ""}
                        onChange={(e) => changeEdit("reason", e.target.value)}
                    />
                ) : (
                    value || "-"
                );
            }
        },
        {
            key: "warningType",
            label: "Nature of Warning",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.warningType ?? ""}
                        onChange={(e) => changeEdit("warningType", e.target.value)}
                    />
                ) : (
                    value || "-"
                );
            }
        },
        {
            key: "date",
            label: "Date",
            type: "date",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        type="date"
                        value={editForm?.date ?? (value === "-" ? "" : value ?? "")}
                        onChange={(e) => changeEdit("date", e.target.value)}
                    />
                ) : (
                    value || "-"
                );
            }
        },
        {
            key: "warningBy",
            label: "Warning by (Rk & Name)",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.warningBy ?? ""}
                        onChange={(e) => changeEdit("warningBy", e.target.value)}
                    />
                ) : (
                    value || "-"
                );
            }
        }
    ];

    const actions: TableAction<CounsellingRow>[] = [
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
                    if (row.id) await onDelete(row.id);
                }
            }
        }
    ];

    const config: TableConfig<CounsellingRow> = {
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
            message: "No saved records for this term."
        },
        loading
    };

    return (
        <div className="mb-6">
            <UniversalTable<CounsellingRow>
                data={rows}
                config={config}
            />
        </div>
    );
}
