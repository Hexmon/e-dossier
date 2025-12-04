"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { ParentCommRow, ParentCommPayload } from "@/hooks/useParentComms";

interface Props {
    rows: ParentCommRow[] | undefined;
    loading: boolean;
    onEditSave: (id: string, payload: Partial<ParentCommPayload>) => Promise<void> | void;
    onDelete: (row: ParentCommRow) => Promise<void> | void;
}

export default function ParentCommTable({ rows, loading, onEditSave, onDelete }: Props) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<ParentCommRow | null>(null);

    if (loading) return <p className="text-center p-4">Loading...</p>;

    if (!rows || rows.length === 0)
        return <p className="text-center p-4 text-gray-500">No data submitted yet for this semester.</p>;

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
            refNo: editForm.letterNo || "",
            date: editForm.date || "",
            subject: editForm.teleCorres || "",
            brief: editForm.briefContents || "",
            platoonCommanderName: editForm.sigPICdr || "",
        });

        cancelEdit();
    };

    const change = (key: keyof ParentCommRow, value: string) => {
        setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    };

    return (
        <div className="overflow-x-auto mb-6 border rounded-lg shadow">
            <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                    <tr>
                        {["S.No", "Letter No", "Date", "Tele/Corres", "Brief", "Sig PI Cdr", "Action"].map((h) => (
                            <th key={h} className="border p-2 text-center">{h}</th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {rows.map((row, i) => {
                        const {
                            id,
                            serialNo = String(i + 1),
                            letterNo = "-",
                            date = "-",
                            teleCorres = "-",
                            briefContents = "-",
                            sigPICdr = "-",
                        } = row;

                        const isEditing = editingId === id;

                        return (
                            <tr key={id ?? `row-${i}`}>
                                <td className="border p-2 text-center">{serialNo}</td>

                                <td className="border p-2 text-center">
                                    {isEditing ? (
                                        <Input
                                            value={editForm?.letterNo ?? ""}
                                            onChange={(e) => change("letterNo", e.target.value)}
                                        />
                                    ) : letterNo}
                                </td>

                                <td className="border p-2 text-center">
                                    {isEditing ? (
                                        <Input
                                            type="date"
                                            value={editForm?.date ?? ""}
                                            onChange={(e) => change("date", e.target.value)}
                                        />
                                    ) : date}
                                </td>

                                <td className="border p-2 text-center">
                                    {isEditing ? (
                                        <Input
                                            value={editForm?.teleCorres ?? ""}
                                            onChange={(e) => change("teleCorres", e.target.value)}
                                        />
                                    ) : teleCorres}
                                </td>

                                <td className="border p-2 text-center">
                                    {isEditing ? (
                                        <Input
                                            value={editForm?.briefContents ?? ""}
                                            onChange={(e) => change("briefContents", e.target.value)}
                                        />
                                    ) : briefContents}
                                </td>

                                <td className="border p-2 text-center">
                                    {isEditing ? (
                                        <Input
                                            value={editForm?.sigPICdr ?? ""}
                                            onChange={(e) => change("sigPICdr", e.target.value)}
                                        />
                                    ) : sigPICdr}
                                </td>

                                <td className="border p-2 text-center">
                                    {!isEditing ? (
                                        <>
                                            <Button size="sm" variant="outline" onClick={() => startEdit(row)}>
                                                Edit
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => onDelete(row)}>
                                                Delete
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button size="sm" onClick={saveEdit}>Save</Button>
                                            <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                                        </>
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
