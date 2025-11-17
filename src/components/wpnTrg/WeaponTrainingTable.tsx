"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type TableRow = {
    id?: string;
    subject: string;
    maxMarks: number;
    obtained: string; 
};

interface Props {
    title?: string;
    savedRows: TableRow[];
    inputRows: TableRow[];
    register: any;
    total: number | string;
    onDelete: (id: string) => void;
    onEditSave: (updated: { id: string; subject: string; maxMarks: number; marksObtained: number }) => Promise<void>;
}

export default function WeaponTrainingTable({
    title,
    savedRows,
    inputRows,
    register,
    total,
    onDelete,
    onEditSave,
}: Props) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<TableRow | null>(null);

    const beginEdit = (row: TableRow & { id?: string }) => {
        setEditingId(row.id ?? null);
        setEditForm({ ...row });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm(null);
    };

    const handleEditChange = (field: keyof TableRow, value: any) => {
        setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    };

    const saveEdit = async () => {
        if (!editForm || !editingId) return;
        try {
            await onEditSave({
                id: editingId,
                subject: editForm.subject,
                maxMarks: Number(editForm.maxMarks),
                marksObtained: Number(editForm.obtained) || 0,
            });
            toast.success("Saved changes");
            cancelEdit();
        } catch (err) {
            toast.error("Failed to save changes");
            console.error(err);
        }
    };

    return (
        <div className="space-y-6">
            {title && <h3 className="font-semibold text-md mb-2 underline">{title}</h3>}

            {/* SAVED TABLE */}
            <div className="overflow-x-auto border rounded-lg shadow mb-4">
                {savedRows.length === 0 ? (
                    <p className="text-center p-4 text-gray-500">No saved data for this term.</p>
                ) : (
                    <table className="w-full border text-sm">
                        <thead className="bg-gray-100 text-left">
                            <tr>
                                <th className="p-2 border">No</th>
                                <th className="p-2 border">Subject</th>
                                <th className="p-2 border">Max Marks</th>
                                <th className="p-2 border">Obtained</th>
                                <th className="p-2 border text-center">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {savedRows.map((row, i) => {
                                const isEditing = editingId === row.id;
                                return (
                                    <tr key={row.id ?? i}>
                                        <td className="p-2 border text-center">{i + 1}</td>

                                        {/* SUBJECT */}
                                        <td className="p-2 border">
                                            {isEditing ? (
                                                <Input
                                                    value={editForm?.subject}
                                                    onChange={(e) => handleEditChange("subject", e.target.value)}
                                                />
                                            ) : (
                                                row.subject
                                            )}
                                        </td>

                                        {/* MAX MARKS */}
                                        <td className="p-2 border text-center">
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    value={String(editForm?.maxMarks ?? "")}
                                                    onChange={(e) => handleEditChange("maxMarks", Number(e.target.value))}
                                                />
                                            ) : (
                                                row.maxMarks
                                            )}
                                        </td>

                                        {/* OBTAINED */}
                                        <td className="p-2 border text-center">
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    value={String(editForm?.obtained ?? "")}
                                                    onChange={(e) => handleEditChange("obtained", e.target.value)}
                                                />
                                            ) : (
                                                row.obtained || "-"
                                            )}
                                        </td>

                                        {/* ACTIONS */}
                                        <td className="p-2 border text-center">
                                            {!isEditing ? (
                                                <>
                                                    <Button type="button" size="sm" variant="outline" onClick={() => beginEdit(row)}>
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="destructive"
                                                        className="ml-2"
                                                        onClick={() => row.id && onDelete(row.id)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button type="button" size="sm" className="bg-green-600 text-white" onClick={saveEdit}>
                                                        Save
                                                    </Button>
                                                    <Button type="button" size="sm" variant="outline" className="ml-2" onClick={cancelEdit}>
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
                )}
            </div>

            {/* INPUT TABLE */}
            <div className="overflow-x-auto border rounded-lg shadow">
                <table className="w-full border text-sm">
                    <thead className="bg-gray-100 text-left">
                        <tr>
                            <th className="p-2 border">No</th>
                            <th className="p-2 border">Subject</th>
                            <th className="p-2 border">Max Marks</th>
                            <th className="p-2 border">Marks Obtained</th>
                        </tr>
                    </thead>

                    <tbody>
                        {inputRows.map((row, index) => (
                            <tr key={index}>
                                <td className="p-2 border text-center">{index + 1}</td>
                                <td className="p-2 border">{row.subject}</td>
                                <td className="p-2 border text-center">{row.maxMarks}</td>
                                <td className="p-2 border">
                                    <Input
                                        {...register(`records.${index}.obtained`)}
                                        type="number"
                                        placeholder="Enter Marks"
                                        className="w-full"
                                    />
                                </td>
                            </tr>
                        ))}

                        {/* TOTAL */}
                        <tr className="font-semibold bg-gray-50">
                            <td className="p-2 border text-center">{inputRows.length + 1}</td>
                            <td className="p-2 border">Total</td>
                            <td className="p-2 border text-center">
                                {inputRows.reduce((s, r) => s + r.maxMarks, 0)}
                            </td>
                            <td className="p-2 border text-center">{total}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
