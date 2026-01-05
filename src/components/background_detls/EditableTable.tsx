"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UniversalTable, TableColumn, TableAction, TableConfig } from "@/components/layout/TableLayout";

interface EditableColumn<T> {
    key: keyof T;
    label: string;
    type?: "text" | "number";
}

interface EditableTableProps<T extends { id: string }> {
    data: T[];
    columns: EditableColumn<T>[];
    onEdit: (row: T) => void;
    onChange: (field: keyof T, value: any) => void;
    onSave: () => void;
    onCancel: () => void;
    onDelete: (row: T) => void;
    editingId: string | null;
}

export function EditableTable<T extends { id: string }>(props: EditableTableProps<T>) {
    const { data, columns, editingId, onEdit, onChange, onSave, onCancel, onDelete } = props;

    const tableColumns: TableColumn<T>[] = [
        {
            key: "sno" as keyof T,
            label: "S.No",
            render: (value, row, index) => index + 1
        },
        ...columns.map(col => ({
            key: col.key,
            label: col.label,
            type: col.type === "number" ? ("number" as const) : ("text" as const),
            render: (value: any, row: T) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        type={col.type === "number" ? "number" : "text"}
                        value={String((row as any)[col.key] ?? "")}
                        onChange={(e) =>
                            onChange(col.key, col.type === "number" ? Number(e.target.value) : e.target.value)
                        }
                    />
                ) : (
                    String((row as any)[col.key] ?? "")
                );
            }
        }))
    ];

    const actions: TableAction<T>[] = [
        {
            key: "edit-cancel",
            label: editingId ? "Cancel" : "Edit",
            variant: editingId ? "outline" : "outline",
            size: "sm",
            handler: (row) => {
                if (editingId === row.id) {
                    onCancel();
                } else {
                    onEdit(row);
                }
            }
        },
        {
            key: "save-delete",
            label: editingId ? "Save" : "Delete",
            variant: editingId ? "default" : "destructive",
            size: "sm",
            handler: (row) => {
                if (editingId === row.id) {
                    onSave();
                } else {
                    onDelete(row);
                }
            }
        }
    ];

    const config: TableConfig<T> = {
        columns: tableColumns,
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
        }
    };

    return (
        <UniversalTable<T>
            data={data}
            config={config}
        />
    );
}
