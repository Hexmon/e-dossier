"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { Achievement } from "@/types/background-detls";
import { useAchievements } from "@/hooks/useAchievementsBackground";

type FormValues = {
    achievements: Omit<Achievement, "id">[];
};

export default function AchievementsSection({ ocId }: { ocId: string }) {
    const { items, fetch, save, update, remove } = useAchievements(ocId);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Achievement | null>(null);

    // Load achievements on mount
    useEffect(() => {
        fetch();
    }, [fetch]);

    // ------------------------------------------
    // RHF Form for Adding New Achievements
    // ------------------------------------------
    const achievementForm = useForm<FormValues>({
        defaultValues: {
            achievements: [{ event: "", year: "", level: "", prize: "" }],
        },
    });

    const { fields, append, remove: removeField } = useFieldArray({
        control: achievementForm.control,
        name: "achievements",
    });

    // Submit handler
    const submitAchievements = async (values: FormValues) => {
        const { achievements } = values;
        const result = await save(achievements);

        if (result) {
            toast.success("Achievements saved");
            await fetch();
            achievementForm.reset();
        }
    };

    // ------------------------------------------
    // Inline Edit Logic
    // ------------------------------------------
    const startEdit = (row: Achievement) => {
        setEditingId(row.id ?? null);
        setEditForm({ ...row });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm(null);
    };

    const changeEdit = <K extends keyof Achievement>(key: K, value: Achievement[K]) => {
        setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    };

    const saveEdit = async () => {
        if (!editingId || !editForm) return toast.error("Invalid operation");

        const ok = await update(editingId, {
            event: editForm.event,
            level: editForm.level,
            prize: editForm.prize,
            year: editForm.year ? Number(editForm.year) : 0,
        });

        if (ok) {
            await fetch();
            cancelEdit();
        }
    };

    const deleteItem = async (id: string | undefined) => {
        if (!id) return toast.error("Invalid record");

        const ok = await remove(id);
        if (ok) await fetch();
    };

    // ------------------------------------------
    // JSX
    // ------------------------------------------
    return (
        <div>
            {/* Saved Achievements Table */}
            {items.length > 0 ? (
                <div className="overflow-x-auto mb-6 border rounded-lg shadow">
                    <table className="min-w-full text-sm border border-gray-300">
                        <thead className="bg-gray-100">
                            <tr>
                                {["S.No", "Event", "Year", "Level", "Prize", "Actions"].map((head) => {
                                    return (
                                        <th key={head} className="border px-4 py-2 text-center bg-gray-300">
                                            {head}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>

                        <tbody>
                            {items.map((row, idx) => {
                                const { id, event, level, prize, year } = row;
                                const isEditing = editingId === id;

                                return (
                                    <tr key={id}>
                                        <td className="border px-4 py-2 text-center">{idx + 1}</td>

                                        {/* EVENT */}
                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    value={editForm?.event ?? ""}
                                                    onChange={(e) => changeEdit("event", e.target.value)}
                                                />
                                            ) : (
                                                event
                                            )}
                                        </td>

                                        {/* YEAR */}
                                        <td className="border px-4 py-2 text-center">
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    value={editForm?.year ?? ""}
                                                    onChange={(e) =>
                                                        changeEdit("year", e.target.value ? Number(e.target.value) : "")
                                                    }
                                                />
                                            ) : (
                                                year
                                            )}
                                        </td>

                                        {/* LEVEL */}
                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    value={editForm?.level ?? ""}
                                                    onChange={(e) => changeEdit("level", e.target.value)}
                                                />
                                            ) : (
                                                level
                                            )}
                                        </td>

                                        {/* PRIZE */}
                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    value={editForm?.prize ?? ""}
                                                    onChange={(e) => changeEdit("prize", e.target.value)}
                                                />
                                            ) : (
                                                prize
                                            )}
                                        </td>

                                        {/* ACTION BUTTONS */}
                                        <td className="border px-4 py-2 text-center space-x-2">
                                            {!isEditing ? (
                                                <>
                                                    <Button size="sm" variant="outline" onClick={() => startEdit(row)}>
                                                        Edit
                                                    </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => deleteItem(id)}>
                                                        Delete
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button size="sm" onClick={saveEdit}>
                                                        Save
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={cancelEdit}>
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
            ) : (
                <p className="text-center mb-4 text-gray-500">No achievements saved yet.</p>
            )}

            {/* Add New Achievement Form */}
            <form onSubmit={achievementForm.handleSubmit(submitAchievements)}>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border border-gray-300">
                        <thead className="bg-gray-100">
                            <tr>
                                {["S.No", "Event", "Year", "Level", "Prize", "Action"].map((head) => {
                                    return (
                                        <th key={head} className="border px-4 py-2 bg-gray-300">
                                            {head}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>

                        <tbody>
                            {fields.map((field, idx) => {
                                return (
                                    <tr key={field.id}>
                                        <td className="border px-4 py-2 text-center">{idx + 1}</td>

                                        {(["event", "year", "level", "prize"] as const).map((col) => {
                                            return (
                                                <td key={col} className="border px-4 py-2">
                                                    <Input
                                                        {...achievementForm.register(`achievements.${idx}.${col}`)}
                                                        placeholder={col}
                                                    />
                                                </td>
                                            );
                                        })}

                                        <td className="border px-4 py-2 text-center">
                                            <Button variant="destructive" type="button" onClick={() => removeField(idx)}>
                                                Remove
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-center gap-3 mt-4">
                    <Button
                        type="button"
                        onClick={() => append({ event: "", year: "", level: "", prize: "" })}
                    >
                        Add Achievement
                    </Button>
                    <Button type="submit" className="bg-[#40ba4d]">Save</Button>
                </div>
            </form>
        </div>
    );
}
