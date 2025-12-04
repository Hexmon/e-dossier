"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

    if (loading) {
        return <p className="text-center">Loading...</p>;
    }

    if (!rows || rows.length === 0) {
        return <p className="text-center text-gray-500">No saved records for this term.</p>;
    }

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

    return (
        <div className="overflow-x-auto border rounded-lg shadow mb-6">
            <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="p-2 border text-center">S No</th>
                        <th className="p-2 border">Reason (Attach copy)</th>
                        <th className="p-2 border">Nature of Warning</th>
                        <th className="p-2 border">Date</th>
                        <th className="p-2 border">Warning by (Rk & Name)</th>
                        <th className="p-2 border text-center">Action</th>
                    </tr>
                </thead>

                <tbody>
                    {rows.map((row, i) => {
                        const {
                            id = "",
                            serialNo = String(i + 1),
                            reason = "-",
                            warningType = "-",
                            date = "",
                            warningBy = "-",
                        } = row;

                        const isEditing = editingId === id;

                        return (
                            <tr key={id || serialNo}>
                                <td className="p-2 border text-center">{serialNo}</td>

                                <td className="p-2 border">
                                    {isEditing ? (
                                        <Input value={editForm?.reason ?? ""} onChange={(e) => changeEdit("reason", e.target.value)} />
                                    ) : (
                                        reason || "-"
                                    )}
                                </td>

                                <td className="p-2 border">
                                    {isEditing ? (
                                        <Input value={editForm?.warningType ?? ""} onChange={(e) => changeEdit("warningType", e.target.value)} />
                                    ) : (
                                        warningType || "-"
                                    )}
                                </td>

                                <td className="p-2 border">
                                    {isEditing ? (
                                        <Input type="date" value={editForm?.date ?? (date === "-" ? "" : date)} onChange={(e) => changeEdit("date", e.target.value)} />
                                    ) : (
                                        date || "-"
                                    )}
                                </td>

                                <td className="p-2 border">
                                    {isEditing ? (
                                        <Input value={editForm?.warningBy ?? ""} onChange={(e) => changeEdit("warningBy", e.target.value)} />
                                    ) : (
                                        warningBy || "-"
                                    )}
                                </td>

                                <td className="p-2 border text-center">
                                    {!isEditing ? (
                                        <div className="flex justify-center gap-2">
                                            <Button size="sm" variant="outline" onClick={() => startEdit(row)}>Edit</Button>
                                            <Button size="sm" variant="destructive" onClick={() => id && onDelete(id)}>Delete</Button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-center gap-2">
                                            <Button size="sm" onClick={saveEdit}>Save</Button>
                                            <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditForm(null); }}>Cancel</Button>
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
