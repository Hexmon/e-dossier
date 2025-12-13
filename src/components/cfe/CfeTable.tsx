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
    StartEdit?: (index: number) => void;
    onReplaceSemester?: (semesterIndex: number, items: { cat: string; marks: number; remarks?: string }[]) => Promise<void> | void;
    onDelete: (index: number, semesterIndex: number, rows: cfeRow[]) => Promise<void> | void;
    semesterIndex: number;
}

export default function CfeTable({ rows, loading, StartEdit, onReplaceSemester, onDelete, semesterIndex }: Props) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValues, setEditValues] = useState<{ cat: string; mks: string; remarks: string }>({ cat: "", mks: "", remarks: "" });

    if (loading) {
        return <p className="text-center text-gray-500 py-4">Loading...</p>;
    }

    if (!rows || rows.length === 0) {
        return <p className="text-center text-gray-500 py-4">No records for this semester.</p>;
    }

    const startEdit = (index: number) => {
        const row = rows[index];
        setEditingIndex(index);
        setEditValues({
            cat: row.cat ?? "",
            mks: row.mks ?? "",
            remarks: row.remarks ?? "",
        });
        StartEdit?.(index);
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
            await onReplaceSemester(semesterIndex, items);
        }

        cancelEdit();
    };

    const handleDelete = async (index: number) => {
        // Call onDelete with the index and full rows array
        // This allows the parent to delete only the specific row
        await onDelete(index, semesterIndex, rows);
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
                        
                        // Generate unique key combining semester index + id + array index
                        const uniqueKey = `${semesterIndex}-${id || "new"}-${idx}`;

                        return (
                            <tr key={uniqueKey}>
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
                                            <Button size="sm" className="bg-green-600" onClick={() => saveEdit(idx)} disabled={loading}>
                                                Save
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={cancelEdit} disabled={loading}>
                                                Cancel
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-center gap-2">
                                            <Button size="sm" variant="outline" onClick={() => startEdit(idx)} disabled={loading}>
                                                Edit
                                            </Button>
                                            {id ? (
                                                <Button size="sm" variant="destructive" onClick={() => handleDelete(idx)} disabled={loading}>
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