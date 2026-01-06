"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UniversalTable, TableColumn, TableAction, TableConfig } from "@/components/layout/TableLayout";
import { toast } from "sonner";

import { FamilyMemberRecord } from "@/app/lib/api/familyApi";
import { FormValues, Props } from "@/types/family-background";
import { useFamily } from "@/hooks/useFamily";

export default function FamilyBackground({ ocId }: Props) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<FamilyMemberRecord | null>(null);

    // ------------------------------------
    // HOOK FOR API OPERATIONS
    // ------------------------------------
    const {
        family,
        setFamily,
        fetchFamily,
        saveFamily,
        updateMember,
        removeMember,
    } = useFamily(ocId);

    useEffect(() => {
        fetchFamily();
    }, [fetchFamily]);

    // ------------------------------------
    // RHF — NEW FAMILY FORM
    // ------------------------------------
    const familyForm = useForm<FormValues>({
        defaultValues: {
            family: [
                { name: "", relation: "", age: "", occupation: "", education: "", mobileNo: "" },
            ],
        },
    });

    const familyFields: (keyof FormValues["family"][number])[] = [
        "name",
        "relation",
        "age",
        "occupation",
        "education",
        "mobileNo",
    ];

    const { fields, append, remove } = useFieldArray({
        control: familyForm.control,
        name: "family",
    });

    const submitFamily = async (values: FormValues) => {
        const { family: newMembers } = values;

        try {
            const saved = await saveFamily(newMembers);

            if (saved && saved.length > 0) {
                toast.success("Family details saved successfully!");
                fetchFamily();
            }
        } catch {
            toast.error("Error saving family details.");
        }
    };

    // ------------------------------------
    // EDITING HANDLERS
    // ------------------------------------
    const startEdit = (member: FamilyMemberRecord) => {
        setEditingId(member.id);
        setEditForm({ ...member });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm(null);
    };

    const changeEdit = <K extends keyof FamilyMemberRecord>(key: K, value: FamilyMemberRecord[K]) => {
        setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    };

    const saveEdit = async () => {
        if (!editForm || !editingId) return toast.error("Invalid edit");

        try {
            await updateMember(editingId, editForm);
            setFamily((prev) => prev.map((f) => (f.id === editingId ? editForm : f)));

            toast.success("Family member updated");
            cancelEdit();
        } catch {
            toast.error("Failed to update family member");
        }
    };

    const deleteMember = async (member: FamilyMemberRecord) => {
        const { id } = member;

        try {
            await removeMember(id);
            setFamily((prev) => prev.filter((f) => f.id !== id));

            toast.success("Family member deleted");
        } catch {
            toast.error("Failed to delete family member");
        }
    };
    const columns: TableColumn<FamilyMemberRecord>[] = [
        {
            key: "sno",
            label: "S.No",
            render: (value, row, index) => index + 1
        },
        {
            key: "name",
            label: "Name",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.name || ""}
                        onChange={(e) => changeEdit("name", e.target.value)}
                    />
                ) : (
                    value
                );
            }
        },
        {
            key: "relation",
            label: "Relation",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.relation || ""}
                        onChange={(e) => changeEdit("relation", e.target.value)}
                    />
                ) : (
                    value
                );
            }
        },
        {
            key: "age",
            label: "Age",
            type: "number",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        type="number"
                        value={editForm?.age || ""}
                        onChange={(e) => changeEdit("age", Number(e.target.value))}
                    />
                ) : (
                    value
                );
            }
        },
        {
            key: "occupation",
            label: "Occupation",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.occupation || ""}
                        onChange={(e) => changeEdit("occupation", e.target.value)}
                    />
                ) : (
                    value
                );
            }
        },
        {
            key: "education",
            label: "Edn Qual",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.education || ""}
                        onChange={(e) => changeEdit("education", e.target.value)}
                    />
                ) : (
                    value
                );
            }
        },
        {
            key: "mobileNo",
            label: "Mobile",
            render: (value, row) => {
                const isEditing = editingId === row.id;
                return isEditing ? (
                    <Input
                        value={editForm?.mobileNo || ""}
                        onChange={(e) => changeEdit("mobileNo", e.target.value)}
                    />
                ) : (
                    value
                );
            }
        }
    ];

    const actions: TableAction<FamilyMemberRecord>[] = [
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
                    await deleteMember(row);
                }
            }
        }
    ];

    const config: TableConfig<FamilyMemberRecord> = {
        columns,
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
            message: "No family data yet."
        }
    };

    return (
        <div className="w-full">

            {/* -------------------------------- SAVED TABLE -------------------------------- */}
            <div className="mb-6 border rounded-lg shadow">
                <UniversalTable<FamilyMemberRecord>
                    data={family}
                    config={config}
                />
            </div>

            {/* -------------------------------- ADD NEW FORM -------------------------------- */}
            <form onSubmit={familyForm.handleSubmit(submitFamily)}>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border border-gray-300">
                        <thead className="bg-gray-100">
                            <tr>
                                {["S.No", "Name", "Relation", "Age", "Occupation", "Edn Qual", "Mobile", "Action"].map((head) => (
                                    <th key={head} className="border px-4 py-2 bg-gray-300">
                                        {head}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {fields.map((item, index) => (
                                <tr key={item.id}>
                                    <td className="border px-4 py-2 text-center">{index + 1}</td>

                                    {familyFields.map((field) => (
                                        <td key={field} className="border px-4 py-2">
                                            <Input
                                                {...familyForm.register(`family.${index}.${field}`)}
                                                placeholder={field}
                                            />
                                        </td>
                                    ))}

                                    <td className="border px-4 py-2 text-center">
                                        <Button variant="destructive" type="button" onClick={() => remove(index)}>
                                            Remove
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex justify-center gap-2">
                    <Button
                        type="button"
                        onClick={() =>
                            append({
                                name: "",
                                relation: "",
                                age: "",
                                occupation: "",
                                education: "",
                                mobileNo: "",
                            })
                        }
                    >
                        Add Member
                    </Button>

                    <Button type="submit" className="bg-[#40ba4d]">Save</Button>
                </div>
            </form>
        </div>
    );
}
