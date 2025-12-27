"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UniversalTable, TableColumn, TableAction, TableConfig } from "@/components/layout/TableLayout";
import { toast } from "sonner";

import { EducationUI, EducationItem } from "@/app/lib/api/educationApi";
import { useEducation } from "@/hooks/useEducation";
import { FormValues } from "@/types/educational-qual";
import { Props } from "@/types/family-background";

export default function EducationQualifications({ ocId, cadet }: Props) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<EducationUI | null>(null);

    // ---------------------------------------------------------
    // HOOK FOR API OPERATIONS
    // ---------------------------------------------------------
    const {
        education,
        setEducation,
        fetchEducation,
        saveEducation,
        updateEducation,
        deleteEducation,
    } = useEducation(ocId);

    useEffect(() => {
        fetchEducation();
    }, [fetchEducation]);

    // ---------------------------------------------------------
    // ADD FORM — RHF
    // ---------------------------------------------------------
    const qualificationForm = useForm<FormValues>({
        defaultValues: {
            qualifications: [
                { qualification: "", school: "", subs: "", board: "", marks: "", grade: "" },
            ],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: qualificationForm.control,
        name: "qualifications",
    });

    const columns = ["qualification", "school", "subs", "board", "marks", "grade"] as const;
    type ColumnKey = typeof columns[number];

    const submitQualifications = async ({ qualifications }: FormValues) => {
        try {
            const payload = qualifications.map((q) => ({
                level: q.qualification,
                school: q.school,
                board: q.board,
                subjects: q.subs,
                percentage: q.marks ? Number(q.marks) : 0,
            }));

            const saved = await saveEducation(payload);

            if (saved && saved.length > 0) {
                toast.success("Education details saved!");
                fetchEducation();
            }
        } catch {
            toast.error("Failed to save qualifications");
        }
    };

    // ---------------------------------------------------------
    // EDIT HANDLERS
    // ---------------------------------------------------------
    const startEdit = (row: EducationUI) => {
        setEditingId(row.id);
        setEditForm({ ...row });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm(null);
    };

    const changeEdit = <K extends keyof EducationUI>(key: K, value: EducationUI[K]) => {
        setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    };

    const saveEdit = async () => {
        if (!editingId || !editForm) return toast.error("Invalid edit");

        try {
            await updateEducation(editingId, {
                totalPercent: editForm.marks ? Number(editForm.marks) : 0,
            });

            toast.success("Record updated!");

            fetchEducation();
            cancelEdit();
        } catch {
            toast.error("Failed to update");
        }
    };

    const removeRow = async (row: EducationUI) => {
        const { id } = row;

        try {
            await deleteEducation(id);
            toast.success("Deleted successfully!");
            fetchEducation();
        } catch {
            toast.error("Failed to delete");
        }
    };

    const tableColumns: TableColumn<EducationUI>[] = [
        {
            key: "sno",
            label: "S.No",
            render: (value, row, index) => index + 1
        },
        {
            key: "qualification",
            label: "Qualification",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.qualification || ""}
                        onChange={(e) => changeEdit("qualification", e.target.value)}
                    />
                ) : (
                    value
                );
            }
        },
        {
            key: "school",
            label: "School",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.school || ""}
                        onChange={(e) => changeEdit("school", e.target.value)}
                    />
                ) : (
                    value
                );
            }
        },
        {
            key: "subs",
            label: "Subs",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.subs || ""}
                        onChange={(e) => changeEdit("subs", e.target.value)}
                    />
                ) : (
                    value
                );
            }
        },
        {
            key: "board",
            label: "Board",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.board || ""}
                        onChange={(e) => changeEdit("board", e.target.value)}
                    />
                ) : (
                    value
                );
            }
        },
        {
            key: "marks",
            label: "Marks",
            type: "number",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        type="number"
                        value={editForm?.marks || ""}
                        onChange={(e) => changeEdit("marks", e.target.value)}
                    />
                ) : (
                    value
                );
            }
        },
        {
            key: "grade",
            label: "Grade",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.grade || ""}
                        onChange={(e) => changeEdit("grade", e.target.value)}
                    />
                ) : (
                    value
                );
            }
        }
    ];

    const actions: TableAction<EducationUI>[] = [
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
                    await removeRow(row);
                }
            }
        }
    ];

    const config: TableConfig<EducationUI> = {
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
            message: "No educational qualifications saved yet."
        }
    };

    return (
        <div>
            {/* ---------------- SAVED EDUCATION TABLE ---------------- */}
            <div className="mb-6 border rounded-lg shadow">
                <UniversalTable<EducationUI>
                    data={education}
                    config={config}
                />
            </div>

            {/* ---------------- ADD NEW QUALIFICATIONS FORM ---------------- */}
            <form onSubmit={qualificationForm.handleSubmit(submitQualifications)}>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border border-gray-300">
                        <thead className="bg-gray-100">
                            <tr>
                                {["S.No", "Qualification", "School", "Subs", "Board", "Marks", "Grade", "Action"].map((head) => {
                                    return (
                                        <th key={head} className="border px-4 py-2 bg-gray-300">
                                            {head}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>

                        <tbody>
                            {fields.map((row, index) => {
                                const {id} = row;
                                return (
                                    <tr key={id}>
                                        <td className="border px-4 py-2 text-center">{index + 1}</td>

                                        {columns.map((field: ColumnKey) => {
                                            return (
                                                <td key={field} className="border px-4 py-2">
                                                    <Input
                                                        {...qualificationForm.register(
                                                            `qualifications.${index}.${field}` as const
                                                        )}
                                                        placeholder={field}
                                                    />
                                                </td>
                                            );
                                        })}

                                        <td className="border px-4 py-2 text-center">
                                            <Button variant="destructive" type="button" onClick={() => remove(index)}>
                                                Remove
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-center gap-2 mt-4">
                    <Button
                        type="button"
                        onClick={() =>
                            append({
                                qualification: "",
                                school: "",
                                subs: "",
                                board: "",
                                marks: "",
                                grade: "",
                            })
                        }
                    >
                        Add Qualification
                    </Button>
                    <Button type="submit" className="bg-[#40ba4d]">Save</Button>
                </div>
            </form>
        </div>
    );
}
