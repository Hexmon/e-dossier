"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UniversalTable, TableColumn, TableAction, TableConfig } from "@/components/layout/TableLayout";
import { toast } from "sonner";

import { Achievement } from "@/types/background-detls";
import { useAchievements } from "@/hooks/useAchievementsBackground";
import type { RootState } from "@/store";
import { saveAchievementsForm, clearAchievementsForm } from "@/store/slices/achievementsSlice";

type FormValues = {
    achievements: Omit<Achievement, "id">[];
};

export default function AchievementsSection({ ocId }: { ocId: string }) {
    const { items, fetch, save, update, remove } = useAchievements(ocId);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Achievement | null>(null);

    // Redux
    const dispatch = useDispatch();
    const savedFormData = useSelector((state: RootState) =>
        state.achievements.forms[ocId]
    );

    // Load achievements on mount
    useEffect(() => {
        fetch();
    }, [fetch]);

    // React Hook Form
    const achievementForm = useForm<FormValues>({
        defaultValues: {
            achievements: savedFormData && savedFormData.length > 0
                ? savedFormData
                : [{ event: "", year: "", level: "", prize: "" }],
        },
    });

    const { fields, append, remove: removeField } = useFieldArray({
        control: achievementForm.control,
        name: "achievements",
    });

    // Auto-save to Redux on form changes
    useEffect(() => {
        const subscription = achievementForm.watch((value) => {
            if (value.achievements && value.achievements.length > 0) {
                const formData = value.achievements.map(achievement => ({
                    event: achievement?.event || "",
                    year: achievement?.year ?? "",
                    level: achievement?.level || "",
                    prize: achievement?.prize || "",
                }));
                dispatch(saveAchievementsForm({ ocId, data: formData }));
            }
        });
        return () => subscription.unsubscribe();
    }, [achievementForm, dispatch, ocId]);

    // Submit handler
    const submitAchievements = async (values: FormValues) => {
        const { achievements } = values;

        // Filter out empty rows
        const filledAchievements = achievements.filter(a =>
            a.event && a.event.trim() !== ""
        );

        if (filledAchievements.length === 0) {
            toast.error("Please add at least one achievement");
            return;
        }

        const result = await save(filledAchievements);

        if (result) {
            toast.success("Achievements saved");
            // Clear Redux cache after successful save
            dispatch(clearAchievementsForm(ocId));
            // Reset form to default state
            achievementForm.reset({
                achievements: [{ event: "", year: "", level: "", prize: "" }]
            });
            await fetch();
        }
    };

    // Clear form handler
    const handleClearForm = () => {
        if (confirm("Are you sure you want to clear all unsaved changes?")) {
            dispatch(clearAchievementsForm(ocId));
            achievementForm.reset({
                achievements: [{ event: "", year: "", level: "", prize: "" }]
            });
            toast.info("Form cleared");
        }
    };

    // Inline Edit Logic
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

    // UNIVERSAL TABLE CONFIGURATION
    const tableColumns: TableColumn<Achievement>[] = [
        {
            key: "sno",
            label: "S.No",
            render: (value, row, index) => index + 1
        },
        {
            key: "event",
            label: "Event",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.event ?? ""}
                        onChange={(e) => changeEdit("event", e.target.value)}
                    />
                ) : (
                    value
                );
            }
        },
        {
            key: "year",
            label: "Year",
            type: "number",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        type="number"
                        value={editForm?.year ?? ""}
                        onChange={(e) =>
                            changeEdit("year", e.target.value ? Number(e.target.value) : "")
                        }
                    />
                ) : (
                    <span className="text-center block">{value}</span>
                );
            }
        },
        {
            key: "level",
            label: "Level",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.level ?? ""}
                        onChange={(e) => changeEdit("level", e.target.value)}
                    />
                ) : (
                    value
                );
            }
        },
        {
            key: "prize",
            label: "Prize",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.prize ?? ""}
                        onChange={(e) => changeEdit("prize", e.target.value)}
                    />
                ) : (
                    value
                );
            }
        }
    ];

    const actions: TableAction<Achievement>[] = [
        {
            key: "edit-cancel",
            label: editingId ? "Cancel" : "Edit",
            variant: editingId ? "outline" : "outline",
            size: "sm",
            handler: (row) => {
                if (editingId === row.id) {
                    cancelEdit();
                } else {
                    startEdit(row);
                }
            }
        },
        {
            key: "save-delete",
            label: editingId ? "Save" : "Delete",
            variant: editingId ? "default" : "destructive",
            size: "sm",
            handler: async (row) => {
                if (editingId === row.id) {
                    await saveEdit();
                } else {
                    await deleteItem(row.id);
                }
            }
        }
    ];

    const config: TableConfig<Achievement> = {
        columns: tableColumns,
        actions,
        features: {
            sorting: false,
            filtering: false,
            pagination: false,
            selection: false,
            search: false
        },
        styling: {
            compact: false,
            bordered: true,
            striped: false,
            hover: false
        },
        theme: {
            variant: "blue"
        },
        emptyState: {
            message: "No achievements saved yet."
        }
    };

    return (
        <div>
            {/* Saved Achievements Table */}
            <div className="mb-6 border rounded-lg shadow">
                <UniversalTable<Achievement>
                    data={items}
                    config={config}
                />
            </div>

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
                                            <Button
                                                variant="destructive"
                                                type="button"
                                                size="sm"
                                                onClick={() => removeField(idx)}
                                            >
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

                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClearForm}
                    >
                        Clear Form
                    </Button>

                    <Button type="submit" className="bg-[#40ba4d]">
                        Save
                    </Button>
                </div>

                {savedFormData && savedFormData.length > 0 && (
                    <p className="text-sm text-muted-foreground text-center mt-2">
                        * Changes are automatically saved
                    </p>
                )}
            </form>
        </div>
    );
}