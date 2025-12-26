"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

    // ------------------------------------
    // UI
    // ------------------------------------
    return (
        <div className="w-full">

            {/* -------------------------------- SAVED TABLE -------------------------------- */}
            {family.length > 0 ? (
                <div className="overflow-x-auto mb-6 border rounded-lg shadow">
                    <table className="min-w-full text-sm border border-gray-300">
                        <thead className="bg-gray-100">
                            <tr>
                                {["S.No", "Name", "Relation", "Age", "Occupation", "Edn Qual", "Mobile", "Action"].map((head) => (
                                    <th key={head} className="border px-4 py-2 bg-gray-300 text-center">
                                        {head}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {family.map((member, index) => {
                                const { id, name, relation, age, occupation, education, mobileNo } = member;
                                const isEditing = editingId === id;

                                return (
                                    <tr key={id}>
                                        <td className="border px-4 py-2 text-center">{index + 1}</td>

                                        {/* NAME */}
                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    value={editForm?.name || ""}
                                                    onChange={(e) => changeEdit("name", e.target.value)}
                                                />
                                            ) : (
                                                name
                                            )}
                                        </td>

                                        {/* RELATION */}
                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    value={editForm?.relation || ""}
                                                    onChange={(e) => changeEdit("relation", e.target.value)}
                                                />
                                            ) : (
                                                relation
                                            )}
                                        </td>

                                        {/* AGE */}
                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    value={editForm?.age || ""}
                                                    onChange={(e) => changeEdit("age", Number(e.target.value))}
                                                />
                                            ) : (
                                                age
                                            )}
                                        </td>

                                        {/* OCCUPATION */}
                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    value={editForm?.occupation || ""}
                                                    onChange={(e) => changeEdit("occupation", e.target.value)}
                                                />
                                            ) : (
                                                occupation
                                            )}
                                        </td>

                                        {/* EDUCATION */}
                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    value={editForm?.education || ""}
                                                    onChange={(e) => changeEdit("education", e.target.value)}
                                                />
                                            ) : (
                                                education
                                            )}
                                        </td>

                                        {/* MOBILE */}
                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    value={editForm?.mobileNo || ""}
                                                    onChange={(e) => changeEdit("mobileNo", e.target.value)}
                                                />
                                            ) : (
                                                mobileNo
                                            )}
                                        </td>

                                        {/* ACTIONS */}
                                        <td className="border px-4 py-2 text-center space-x-2">
                                            {!isEditing ? (
                                                <>
                                                    <Button size="sm" variant="outline" onClick={() => startEdit(member)}>
                                                        Edit
                                                    </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => deleteMember(member)}>
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
                <p className="text-center text-gray-500">No family data yet.</p>
            )}

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

