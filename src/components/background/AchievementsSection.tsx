"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import {
    getAchievements,
    saveAchievements,
    updateAchievementRecord,
    deleteAchievementRecord
} from "@/app/lib/api/achievementsApi";

import { Achievement } from "@/types/background-detls";

export default function AchievementsSection({ selectedCadet }: { selectedCadet: any }) {
    const [savedAchievements, setSavedAchievements] = useState<Achievement[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Achievement | null>(null);

    // -------------------------------
    // FETCH ACHIEVEMENTS DATA
    // -------------------------------
    const fetchAchievementsData = useCallback(async () => {
        if (!selectedCadet?.ocId) return;

        try {
            const data = await getAchievements(selectedCadet.ocId);

            const attachIds = data.map((a) => ({
                id: crypto.randomUUID(), // unique frontend ID
                ...a,
            }));

            setSavedAchievements(attachIds);
        } catch (err) {
            toast.error("Failed to load achievements.");
        }
    }, [selectedCadet?.ocId]);

    useEffect(() => {
        fetchAchievementsData();
    }, [fetchAchievementsData]);

    // -------------------------------
    // ADD ACHIEVEMENTS FORM
    // -------------------------------
    const achievementForm = useForm<{ achievements: Achievement[] }>({
        defaultValues: {
            achievements: [{ id: "", event: "", year: 0, level: "", prize: "" }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: achievementForm.control,
        name: "achievements",
    });

    const submitAchievements = async (data: { achievements: Achievement[] }) => {
        if (!selectedCadet?.ocId) return toast.error("No cadet selected");

        try {
            const payload = data.achievements.map((a) => ({
                event: a.event,
                year: Number(a.year),
                level: a.level,
                prize: a.prize,
            }));

            const responses = await saveAchievements(selectedCadet.ocId, payload);

            if (responses.length > 0) {
                toast.success("Achievements saved!");
                await fetchAchievementsData();
            }
        } catch (err) {
            toast.error("Failed to save achievements");
        }
    };

    // -------------------------------
    // EDIT HANDLERS
    // -------------------------------
    const handleEdit = (row: Achievement) => {
        setEditingId(row.id ?? null);
        setEditForm({ ...row });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm(null);
    };

    const handleChange = (field: keyof Achievement, value: any) => {
        setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    };

    const handleSave = async () => {
        if (!selectedCadet?.ocId || !editingId || !editForm)
            return toast.error("Invalid operation");

        try {
            await updateAchievementRecord(selectedCadet.ocId, editingId, {
                event: editForm.event,
                year: editForm.year ? Number(editForm.year) : undefined,
                level: editForm.level,
                prize: editForm.prize,
            });

            toast.success("Achievement updated!");

            await fetchAchievementsData();
            setEditingId(null);
            setEditForm(null);
        } catch (err) {
            toast.error("Failed to update achievement");
        }
    };

    // -------------------------------
    // DELETE HANDLER
    // -------------------------------
    const handleDelete = async (row: Achievement) => {
        if (!selectedCadet?.ocId || !row.id) return toast.error("Invalid record");

        try {
            await deleteAchievementRecord(selectedCadet.ocId, row.id);

            toast.success("Deleted successfully!");

            await fetchAchievementsData();
        } catch (err) {
            toast.error("Failed to delete achievement");
        }
    };

    return (
        <div>
            {/* Saved Achievements Table */}
            {savedAchievements.length > 0 ? (
                <div className="overflow-x-auto mb-6 border rounded-lg shadow">
                    <table className="min-w-full text-sm border border-gray-300">
                        <thead className="bg-gray-100">
                            <tr>
                                {["S.No", "Event", "Year", "Level", "Prize", "Actions"].map((head) => (
                                    <th key={head} className="border px-4 py-2 bg-gray-300 text-center">
                                        {head}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {savedAchievements.map((ach, idx) => {
                                const isEditing = editingId === ach.id;

                                return (
                                    <tr key={ach.id}>
                                        <td className="border px-4 py-2 text-center">{idx + 1}</td>

                                        {/* EVENT */}
                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    value={editForm?.event || ""}
                                                    onChange={(e) => handleChange("event", e.target.value)}
                                                />
                                            ) : (
                                                ach.event
                                            )}
                                        </td>

                                        {/* YEAR */}
                                        <td className="border px-4 py-2 text-center">
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    value={editForm?.year || ""}
                                                    onChange={(e) =>
                                                        handleChange("year", e.target.value ? Number(e.target.value) : "")
                                                    }
                                                />
                                            ) : (
                                                ach.year
                                            )}
                                        </td>

                                        {/* LEVEL */}
                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    value={editForm?.level || ""}
                                                    onChange={(e) => handleChange("level", e.target.value)}
                                                />
                                            ) : (
                                                ach.level
                                            )}
                                        </td>

                                        {/* PRIZE */}
                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    value={editForm?.prize || ""}
                                                    onChange={(e) => handleChange("prize", e.target.value)}
                                                />
                                            ) : (
                                                ach.prize
                                            )}
                                        </td>

                                        {/* ACTION BUTTONS */}
                                        <td className="border px-4 py-2 text-center space-x-2">
                                            {!isEditing ? (
                                                <>
                                                    <Button size="sm" variant="outline" onClick={() => handleEdit(ach)}>
                                                        Edit
                                                    </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleDelete(ach)}>
                                                        Delete
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button size="sm" onClick={handleSave}>Save</Button>
                                                    <Button size="sm" variant="outline" onClick={handleCancel}>
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
                                {["S.No", "Event", "Year", "Level", "Prize", "Action"].map((head) => (
                                    <th key={head} className="border px-4 py-2 bg-gray-300">
                                        {head}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {fields.map((item, idx) => (
                                <tr key={item.id}>
                                    <td className="border px-4 py-2 text-center">{idx + 1}</td>

                                    {["event", "year", "level", "prize"].map((field) => (
                                        <td key={field} className="border px-4 py-2">
                                            <Input
                                                {...achievementForm.register(`achievements.${idx}.${field}` as any)}
                                                placeholder={field}
                                            />
                                        </td>
                                    ))}

                                    <td className="border px-4 py-2 text-center">
                                        <Button variant="destructive" type="button" onClick={() => remove(idx)}>
                                            Remove
                                        </Button>
                                    </td>
                                </tr>
                            ))}
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
                    <Button type="submit">Save</Button>
                </div>
            </form>
        </div>
    );
}
