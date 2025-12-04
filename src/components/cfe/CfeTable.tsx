// components/cfe/CfeTable.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { catOptions } from "@/constants/app.constants";
import type { cfeRow } from "@/types/cfe";

interface Props {
    rows: cfeRow[];
    loading: boolean;
    onStartEdit?: (index: number) => void;
    onReplaceSemester?: (semesterIndex: number, items: { cat: string; marks: number; remarks?: string }[]) => Promise<void> | void;
    onDelete: (id: string) => Promise<void> | void;
}

export default function CfeTable({ rows, loading, onStartEdit, onReplaceSemester, onDelete }: Props) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValues, setEditValues] = useState<{ cat: string; mks: string; remarks: string }>({ cat: "", mks: "", remarks: "" });

    if (loading) {
        return <p className="text-center">Loading...</p>;
    }

    if (!rows || rows.length === 0) {
        return <p className="text-center text-gray-500">No submitted rows for this semester.</p>;
    }

    const startEdit = (index: number) => {
        const row = rows[index];
        setEditingIndex(index);
        setEditValues({
            cat: row.cat ?? "",
            mks: row.mks ?? "",
            remarks: row.remarks ?? "",
        });
        onStartEdit?.(index);
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditValues({ cat: "", mks: "", remarks: "" });
    };

    const saveEdit = async (index: number) => {
        // Build new items array by replacing the single index
        const items = rows.map((r, i) => {
            if (i !== index) {
                return { cat: r.cat ?? "", marks: Number(r.mks) || 0, remarks: r.remarks ?? "" };
            }
            return { cat: editValues.cat, marks: Number(editValues.mks) || 0, remarks: editValues.remarks ?? "" };
        });

        if (onReplaceSemester) {
            await onReplaceSemester(0, items); // note: consumer will call for proper semester index if required
        }

        cancelEdit();
    };

    return (
        <div className="overflow-x-auto border rounded-lg shadow mb-6">
            <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="p-2 border">S No</th>
                        <th className="p-2 border">Cat</th>
                        <th className="p-2 border">Mks</th>
                        <th className="p-2 border">Remarks</th>
                        <th className="p-2 border text-center">Action</th>
                    </tr>
                </thead>

                <tbody>
                    {rows.map((row, idx) => {
                        const { id = "", serialNo = String(idx + 1), cat = "-", mks = "0", remarks = "" } = row;
                        const isEditing = editingIndex === idx;

                        return (
                            <tr key={id || `${idx}`}>
                                <td className="p-2 border text-center">{serialNo}</td>

                                <td className="p-2 border">
                                    {isEditing ? (
                                        <Select value={editValues.cat} onValueChange={(v) => setEditValues((p) => ({ ...p, cat: v }))}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {catOptions.map((opt) => (
                                                    <SelectItem key={opt} value={opt}>
                                                        {opt}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        cat || "-"
                                    )}
                                </td>

                                <td className="p-2 border text-center">
                                    {isEditing ? (
                                        <Input value={editValues.mks} onChange={(e) => setEditValues((p) => ({ ...p, mks: e.target.value }))} />
                                    ) : (
                                        mks
                                    )}
                                </td>

                                <td className="p-2 border">
                                    {isEditing ? (
                                        <Input value={editValues.remarks} onChange={(e) => setEditValues((p) => ({ ...p, remarks: e.target.value }))} />
                                    ) : (
                                        remarks || "-"
                                    )}
                                </td>

                                <td className="p-2 border text-center">
                                    {isEditing ? (
                                        <div className="flex justify-center gap-2">
                                            <Button size="sm" className="bg-green-600" onClick={() => saveEdit(idx)}>
                                                Save
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                                                Cancel
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-center gap-2">
                                            <Button size="sm" variant="outline" onClick={() => startEdit(idx)}>
                                                Edit
                                            </Button>
                                            {id ? (
                                                <Button size="sm" variant="destructive" onClick={() => onDelete(id)}>
                                                    Delete
                                                </Button>
                                            ) : null}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
