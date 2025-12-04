"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

    if (loading) {
        return <p className="text-center">Loading...</p>;
    }

    if (!rows || rows.length === 0) {
        return <p className="text-center text-gray-500">No data submitted yet for this semester.</p>;
    }

    const startEdit = (row: HookRow) => {
        setEditingId(row.id ?? null);
        setEditForm({ ...row });
    };

    const changeEdit = <K extends keyof HookRow>(key: K, value: HookRow[K]) => {
        setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    };

    const saveEdit = async () => {
        if (!editingId || !editForm) return;
        await onEditSave(editingId, editForm);
        setEditingId(null);
        setEditForm(null);
    };

    return (
        <div className="overflow-x-auto mb-6 border rounded-lg shadow">
            <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="border p-2 text-center">S.No</th>
                        <th className="border p-2 text-center">Date</th>
                        <th className="border p-2 text-center">Offence</th>
                        <th className="border p-2 text-center">Punishment</th>
                        <th className="border p-2 text-center">Date Awarded</th>
                        <th className="border p-2 text-center">By Whom</th>
                        <th className="border p-2 text-center">Negative Pts</th>
                        <th className="border p-2 text-center">Cumulative</th>
                        <th className="border p-2 text-center">Action</th>
                    </tr>
                </thead>

                <tbody>
                    {rows.map((row) => {
                        const {
                            id = "",
                            serialNo = "-",
                            dateOfOffence = "-",
                            offence = "-",
                            punishmentAwarded = "-",
                            dateOfAward = "-",
                            byWhomAwarded = "-",
                            negativePts = "0",
                            cumulative = "0",
                        } = row;

                        const isEditing = editingId === id;

                        return (
                            <tr key={id || serialNo}>
                                <td className="border p-2 text-center">{serialNo}</td>

                                <td className="border p-2 text-center">
                                    {isEditing ? (
                                        <Input
                                            type="date"
                                            value={String(editForm?.dateOfOffence ?? dateOfOffence === "-" ? "" : dateOfOffence)}
                                            onChange={(e) => changeEdit("dateOfOffence", e.target.value)}
                                        />
                                    ) : (
                                        dateOfOffence || "-"
                                    )}
                                </td>

                                <td className="border p-2 text-center">
                                    {isEditing ? (
                                        <Input
                                            value={String(editForm?.offence ?? offence)}
                                            onChange={(e) => changeEdit("offence", e.target.value)}
                                        />
                                    ) : (
                                        offence || "-"
                                    )}
                                </td>

                                <td className="border p-2 text-center">
                                    {isEditing ? (
                                        <Input
                                            value={String(editForm?.punishmentAwarded ?? punishmentAwarded)}
                                            onChange={(e) => changeEdit("punishmentAwarded", e.target.value)}
                                        />
                                    ) : (
                                        punishmentAwarded || "-"
                                    )}
                                </td>

                                <td className="border p-2 text-center">
                                    {isEditing ? (
                                        <Input
                                            type="date"
                                            value={String(editForm?.dateOfAward ?? (dateOfAward === "-" ? "" : dateOfAward))}
                                            onChange={(e) => changeEdit("dateOfAward", e.target.value)}
                                        />
                                    ) : (
                                        dateOfAward || "-"
                                    )}
                                </td>

                                <td className="border p-2 text-center">
                                    {isEditing ? (
                                        <Input
                                            value={String(editForm?.byWhomAwarded ?? byWhomAwarded)}
                                            onChange={(e) => changeEdit("byWhomAwarded", e.target.value)}
                                        />
                                    ) : (
                                        byWhomAwarded || "-"
                                    )}
                                </td>

                                <td className="border p-2 text-center">
                                    {isEditing ? (
                                        <Input
                                            type="number"
                                            value={String(editForm?.negativePts ?? negativePts)}
                                            onChange={(e) => changeEdit("negativePts", e.target.value)}
                                        />
                                    ) : (
                                        negativePts
                                    )}
                                </td>

                                <td className="border p-2 text-center">
                                    {/* show cumulative even if positive in table; form shows negative only */}
                                    {cumulative ?? "0"}
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
                                            <Button size="sm" onClick={saveEdit}>
                                                Save
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setEditingId(null);
                                                    setEditForm(null);
                                                }}
                                            >
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
        </div>
    );
}
