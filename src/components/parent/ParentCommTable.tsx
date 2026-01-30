"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UniversalTable, TableColumn, TableAction, TableConfig } from "@/components/layout/TableLayout";

import type { ParentCommRow } from "@/hooks/useParentComms";
import { ParentCommPayload } from "@/app/lib/api/parentComnApi";

interface Props {
    rows: ParentCommRow[] | undefined;
    loading: boolean;
    onEditSave: (id: string, payload: Partial<ParentCommPayload>) => Promise<void> | void;
    onDelete: (row: ParentCommRow) => Promise<void> | void;
}

export default function ParentCommTable({ rows, loading, onEditSave, onDelete }: Props) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<ParentCommRow | null>(null);

    const startEdit = (row: ParentCommRow) => {
        if (!row.id) return;
        setEditingId(row.id);
        setEditForm({ ...row });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm(null);
    };

    const saveEdit = async () => {
        if (!editingId || !editForm) return;

        await onEditSave(editingId, {
            refNo: editForm.letterNo || undefined,
            date: editForm.date || undefined,
            subject: editForm.teleCorres || undefined,
            brief: editForm.briefContents || undefined,
            platoonCommanderName: editForm.sigPICdr || undefined,
        });

        cancelEdit();
    };

    const change = (key: keyof ParentCommRow, value: string) => {
        setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    };

    const columns: TableColumn<ParentCommRow>[] = [
        {
            key: "serialNo",
            label: "S.No",
            render: (value, row, index) => value || String(index + 1)
        },
        {
            key: "letterNo",
            label: "Letter No",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.letterNo ?? ""}
                        onChange={(e) => change("letterNo", e.target.value)}
                    />
                ) : value || "-";
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
                        value={editForm?.date ?? ""}
                        onChange={(e) => change("date", e.target.value)}
                    />
                ) : value || "-";
            }
        },
        {
            key: "teleCorres",
            label: "Tele/Corres",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.teleCorres ?? ""}
                        onChange={(e) => change("teleCorres", e.target.value)}
                    />
                ) : value || "-";
            }
        },
        {
            key: "briefContents",
            label: "Brief",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.briefContents ?? ""}
                        onChange={(e) => change("briefContents", e.target.value)}
                    />
                ) : value || "-";
            }
        },
        {
            key: "sigPICdr",
            label: "Sig PI Cdr",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.sigPICdr ?? ""}
                        onChange={(e) => change("sigPICdr", e.target.value)}
                    />
                ) : value || "-";
            }
        }
    ];

    const actions: TableAction<ParentCommRow>[] = [
        {
            key: "edit-cancel",
            label: editingId ? "Cancel" : "Edit",
            variant: editingId ? "outline" : "outline",
            size: "sm",
            handler: (row) => {
                if (editingId === row.id) {
                    cancelEdit();
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

    const config: TableConfig<ParentCommRow> = {
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
            <UniversalTable<ParentCommRow>
                data={rows || []}
                config={config}
            />
        </div>
    );
}
