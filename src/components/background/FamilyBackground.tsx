"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    getFamilyDetails,
    saveFamilyDetails,
    updateFamilyMember,
    deleteFamilyMember,
    FamilyMemberRecord,
    FamilyMember
} from "@/app/lib/api/familyApi";
import { toast } from "sonner";

interface Props {
    selectedCadet: any;
}

export default function FamilyBackground({ selectedCadet }: Props) {
    const [savedFamily, setSavedFamily] = useState<FamilyMemberRecord[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<FamilyMemberRecord | null>(null);

    // -----------------------------
    // FETCH FAMILY DATA
    // -----------------------------
    const fetchFamilyData = useCallback(async () => {
        if (!selectedCadet?.ocId) return;

        try {
            const data = await getFamilyDetails(selectedCadet.ocId);
            if (data.length > 0) {
                setSavedFamily(data);
            }
        } catch (err) {
            toast.error("Error loading family background data.");
        }
    }, [selectedCadet?.ocId]);

    useEffect(() => {
        fetchFamilyData();
    }, [fetchFamilyData]);

    // -----------------------------
    // ADD NEW FAMILY
    // -----------------------------
    const familyForm = useForm<{ family: FamilyMember[] }>({
        defaultValues: {
            family: [
                {
                    name: "",
                    relation: "",
                    age: "",
                    occupation: "",
                    education: "",
                    mobile: ""
                },
            ],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: familyForm.control,
        name: "family",
    });

    const submitFamily = async (data: { family: FamilyMember[] }) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        try {
            const responses = await saveFamilyDetails(selectedCadet.ocId, data.family);

            if (responses.length > 0) {
                await fetchFamilyData();
                toast.success("Family details saved successfully!");
            }
        } catch (err) {
            toast.error("Unexpected error while saving family details.");
        }
    };

    // -----------------------------
    // EDIT FAMILY
    // -----------------------------
    const handleEditFamily = (member: FamilyMemberRecord) => {
        setEditingId(member.id);
        setEditForm({ ...member });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm(null);
    };

    const handleChangeEdit = (field: keyof FamilyMemberRecord, value: any) => {
        setEditForm(prev => prev ? { ...prev, [field]: value } : prev);
    };

    const handleSaveFamily = async () => {
        if (!selectedCadet?.ocId || !editingId || !editForm) {
            toast.error("Invalid operation");
            return;
        }

        try {
            await updateFamilyMember(selectedCadet.ocId, editingId, editForm);

            setSavedFamily(prev =>
                prev.map(f => (f.id === editingId ? editForm : f))
            );

            toast.success("Family member updated");
            setEditingId(null);
            setEditForm(null);
        } catch (err) {
            toast.error("Failed to update family member");
        }
    };

    // -----------------------------
    // DELETE FAMILY
    // -----------------------------
    const handleDeleteFamily = async (member: FamilyMemberRecord) => {
        if (!selectedCadet?.ocId || !member.id) {
            toast.error("Invalid family record");
            return;
        }

        try {
            await deleteFamilyMember(selectedCadet.ocId, member.id);

            setSavedFamily(prev => prev.filter(f => f.id !== member.id));
            toast.success("Family member deleted");
        } catch (err) {
            toast.error("Failed to delete family member");
        }
    };

    // -----------------------------
    // UI RENDER
    // -----------------------------
    return (
        <div className="w-full">
            {/* Saved Family Table */}
            {savedFamily.length > 0 ? (
                <div className="overflow-x-auto mb-6 border rounded-lg shadow">
                    <table className="min-w-full text-sm text-left border border-gray-300">
                        <thead className="bg-gray-100">
                            <tr>
                                {["S.No", "Name", "Relation", "Age", "Occupation", "Edn Qual", "Mobile", "Action"].map(
                                    head => (
                                        <th key={head} className="border px-4 py-2 !bg-gray-300 text-center">
                                            {head}
                                        </th>
                                    )
                                )}
                            </tr>
                        </thead>

                        <tbody>
                            {savedFamily.map((m, idx) => {
                                const isEditing = editingId === m.id;

                                return (
                                    <tr key={m.id}>
                                        <td className="border px-4 py-2 text-center">{idx + 1}</td>

                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    value={editForm?.name || ""}
                                                    onChange={e => handleChangeEdit("name", e.target.value)}
                                                />
                                            ) : (
                                                m.name
                                            )}
                                        </td>

                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    value={editForm?.relation || ""}
                                                    onChange={e => handleChangeEdit("relation", e.target.value)}
                                                />
                                            ) : (
                                                m.relation
                                            )}
                                        </td>

                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    value={String(editForm?.age || "")}
                                                    onChange={e =>
                                                        handleChangeEdit("age", Number(e.target.value))
                                                    }
                                                />
                                            ) : (
                                                m.age
                                            )}
                                        </td>

                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    value={editForm?.occupation || ""}
                                                    onChange={e => handleChangeEdit("occupation", e.target.value)}
                                                />
                                            ) : (
                                                m.occupation
                                            )}
                                        </td>

                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    value={editForm?.education || ""}
                                                    onChange={e => handleChangeEdit("education", e.target.value)}
                                                />
                                            ) : (
                                                m.education
                                            )}
                                        </td>

                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    value={editForm?.mobile || ""}
                                                    onChange={e => handleChangeEdit("mobile", e.target.value)}
                                                />
                                            ) : (
                                                m.mobile
                                            )}
                                        </td>

                                        <td className="border px-4 py-2 text-center space-x-2">
                                            {!isEditing ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEditFamily(m)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleDeleteFamily(m)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button size="sm" onClick={handleSaveFamily}>
                                                        Save
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={handleCancelEdit}
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
            ) : (
                <p className="text-center mb-4 text-gray-500">No family data yet.</p>
            )}

            {/* Add New Family Section */}
            <form onSubmit={familyForm.handleSubmit(submitFamily)}>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left border border-gray-300">
                        <thead className="bg-gray-100">
                            <tr>
                                {["S.No", "Name", "Relation", "Age", "Occupation", "Edn Qual", "Mobile", "Action"].map(
                                    head => (
                                        <th key={head} className="border px-4 py-2 !bg-gray-300">
                                            {head}
                                        </th>
                                    )
                                )}
                            </tr>
                        </thead>

                        <tbody>
                            {fields.map((field, idx) => (
                                <tr key={field.id}>
                                    <td className="border px-4 py-2 text-center">{idx + 1}</td>

                                    {["name", "relation", "age", "occupation", "education", "mobile"].map(
                                        col => (
                                            <td key={col} className="border px-4 py-2">
                                                <Input
                                                    {...familyForm.register(`family.${idx}.${col}` as any)}
                                                    placeholder={col}
                                                />
                                            </td>
                                        )
                                    )}

                                    <td className="border px-4 py-2 text-center">
                                        <Button
                                            variant="destructive"
                                            type="button"
                                            onClick={() => remove(idx)}
                                        >
                                            Remove
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex gap-2 justify-center">
                    <Button
                        type="button"
                        onClick={() =>
                            append({
                                name: "",
                                relation: "",
                                age: "",
                                occupation: "",
                                education: "",
                                mobile: "",
                            })
                        }
                    >
                        Add Member
                    </Button>

                    <Button type="submit">Save</Button>
                </div>
            </form>
        </div>
    );
}
