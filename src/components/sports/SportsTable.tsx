"use client";

import { Input } from "@/components/ui/input";
import { Row as SemesterRow } from "@/types/sportsAwards";
import { useState, useCallback } from "react";
import { updateSportsAndGames, deleteSportsAndGames } from "@/app/lib/api/sportsAndGamesApi";
import { toast } from "sonner";
import { deleteMotivationAward, updateMotivationAward } from "@/app/lib/api/motivationAwardApi";

interface Props {
    title: string;
    termKey: string;
    rows: SemesterRow[];
    savedRows: SemesterRow[];
    register: any;
    onRowUpdated: (updatedRow: any) => void;
    onRowDeleted: (id: string) => void;
}

export default function SportsGamesTable({
    title,
    termKey,
    rows,
    savedRows,
    register,
    onRowUpdated,
    onRowDeleted,
}: Props) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>(null);

    // Start Editing
    const beginEdit = (row: any) => {
        setEditingId(row.id);
        setEditForm({ ...row });
    };

    const handleEditChange = (field: string, value: any) => {
        setEditForm((prev: any) => ({ ...prev, [field]: value }));
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm(null);
    };

    // Save Updated Row
    const saveRow = useCallback(async (row: any) => {
        try {
            if (termKey === "spring" || termKey === "autumn") {
                await updateSportsAndGames(row.ocId, row.id, {
                    sport: editForm.activity,
                    maxMarks: Number(editForm.maxMarks),
                    marksObtained: Number(editForm.obtained),
                });
            } else {
                await updateMotivationAward(row.ocId, row.id, {
                    fieldName: editForm.activity,
                    motivationTitle: editForm.string,
                    maxMarks: Number(editForm.maxMarks),
                    marksObtained: Number(editForm.obtained),
                });
            }

            toast.success("Updated successfully!");
            onRowUpdated(editForm);
            cancelEdit();
        } catch (err) {
            toast.error("Failed to update");
        }
    }, [termKey, editForm, onRowUpdated]);

    // Delete Row
    const deleteRow = useCallback(async (row: any) => {
        try {
            if (termKey === "spring" || termKey === "autumn") {
                await deleteSportsAndGames(row.ocId, row.id);
            } else {
                await deleteMotivationAward(row.ocId, row.id);
            }

            toast.success("Deleted!");
            onRowDeleted(row.id);
        } catch (err) {
            toast.error("Delete failed");
        }
    }, [termKey, onRowDeleted]);

    return (
        <div className="mb-10">
            <h2 className="font-semibold text-md mb-2 underline">{title}</h2>

            {/* ==================== SAVED TABLE ==================== */}
            <div className="overflow-x-auto border rounded-lg shadow mb-4">
                {savedRows.length === 0 ? (
                    <p className="text-center p-4 text-gray-500">No data submitted yet.</p>
                ) : (
                    <table className="w-full border text-sm">
                        <thead className="bg-gray-100 text-left">
                            <tr>
                                <th className="p-2 border">Games / Awards</th>
                                <th className="p-2 border">String</th>
                                <th className="p-2 border">Max Marks</th>
                                <th className="p-2 border">Obtained</th>
                                <th className="p-2 border">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {savedRows.map((row, i) => {
                                const isEditing = editingId === row.id;

                                return (
                                    <tr key={row.id || i}>
                                        {/* ACTIVITY */}
                                        <td className="p-2 border">
                                            {isEditing ? (
                                                <Input
                                                    value={editForm.activity}
                                                    onChange={(e) =>
                                                        handleEditChange("activity", e.target.value)
                                                    }
                                                />
                                            ) : (
                                                row.activity
                                            )}
                                        </td>

                                        {/* STRING */}
                                        <td className="p-2 border">
                                            {isEditing ? (
                                                <Input
                                                    value={editForm.string}
                                                    onChange={(e) =>
                                                        handleEditChange("string", e.target.value)
                                                    }
                                                />
                                            ) : (
                                                row.string || "-"
                                            )}
                                        </td>

                                        {/* MAX MARKS */}
                                        <td className="p-2 border">
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    value={editForm.maxMarks}
                                                    onChange={(e) =>
                                                        handleEditChange("maxMarks", e.target.value)
                                                    }
                                                />
                                            ) : (
                                                row.maxMarks
                                            )}
                                        </td>

                                        {/* OBTAINED */}
                                        <td className="p-2 border">
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    value={editForm.obtained}
                                                    onChange={(e) =>
                                                        handleEditChange("obtained", e.target.value)
                                                    }
                                                />
                                            ) : (
                                                row.obtained
                                            )}
                                        </td>

                                        {/* ACTION BUTTONS */}
                                        <td className="p-2 border text-center">
                                            {!isEditing ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="px-2 py-1 bg-yellow-500 text-white rounded"
                                                        onClick={() => beginEdit(row)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="px-2 py-1 bg-red-600 text-white rounded ml-2"
                                                        onClick={() => deleteRow(row)}
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="px-2 py-1 bg-green-600 text-white rounded"
                                                        onClick={() => saveRow(row)}
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="px-2 py-1 bg-gray-400 text-white rounded ml-2"
                                                        onClick={cancelEdit}
                                                    >
                                                        Cancel
                                                    </button>
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

            {/* ==================== INPUT TABLE ==================== */}
            <div className="overflow-x-auto border rounded-lg shadow">
                <table className="w-full border text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border">Games / Awards</th>
                            <th className="p-2 border">String</th>
                            <th className="p-2 border">Max Marks</th>
                            <th className="p-2 border">Obtained</th>
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={index}>
                                <td className="p-2 border">{row.activity}</td>

                                <td className="p-2 border">
                                    <Input
                                        {...register(`${termKey}.${index}.string`)}
                                        defaultValue={row.string}
                                    />
                                </td>

                                <td className="p-2 border">
                                    <Input
                                        {...register(`${termKey}.${index}.maxMarks`)}
                                        type="number"
                                        defaultValue={row.maxMarks}
                                    />
                                </td>

                                <td className="p-2 border">
                                    <Input
                                        {...register(`${termKey}.${index}.obtained`)}
                                        type="number"
                                        defaultValue={row.obtained}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
