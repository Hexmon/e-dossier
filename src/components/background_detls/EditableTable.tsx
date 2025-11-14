"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

    return (
        <table className="min-w-full text-sm border border-gray-300">
            <thead className="bg-gray-100">
                <tr>
                    <th className="border px-4 py-2 text-center">S.No</th>
                    {columns.map(col => (
                        <th key={String(col.key)} className="border px-4 py-2 text-center">
                            {col.label}
                        </th>
                    ))}
                    <th className="border px-4 py-2 text-center">Action</th>
                </tr>
            </thead>

            <tbody>
                {data.map((row, idx) => {
                    const isEditing = editingId === row.id;

                    return (
                        <tr key={row.id}>
                            <td className="border px-4 py-2 text-center">{idx + 1}</td>

                            {columns.map(col => (
                                <td key={String(col.key)} className="border px-4 py-2">
                                    {isEditing ? (
                                        <Input
                                            type={col.type === "number" ? "number" : "text"}
                                            value={String((row as any)[col.key] ?? "")}
                                            onChange={(e) =>
                                                onChange(col.key, col.type === "number" ? Number(e.target.value) : e.target.value)
                                            }
                                        />
                                    ) : (
                                        String((row as any)[col.key] ?? "")
                                    )}
                                </td>
                            ))}

                            <td className="border px-4 py-2 text-center space-x-2">
                                {!isEditing ? (
                                    <>
                                        <Button size="sm" variant="outline" onClick={() => onEdit(row)}>
                                            Edit
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => onDelete(row)}>
                                            Delete
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button size="sm" onClick={onSave}>Save</Button>
                                        <Button size="sm" variant="outline" onClick={onCancel}>
                                            Cancel
                                        </Button>
                                    </>
                                )}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
