"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UniversalTable, TableColumn, TableAction, TableConfig } from "@/components/layout/TableLayout";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { FamilyMemberRecord } from "@/app/lib/api/familyApi";
import { FormValues, Props } from "@/types/family-background";
import { useFamily } from "@/hooks/useFamily";
import type { RootState } from "@/store";
import { saveFamilyForm, clearFamilyForm } from "@/store/slices/familyBackgroundSlice";

export default function FamilyBackground({ ocId }: Props) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<FamilyMemberRecord | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<FamilyMemberRecord | null>(null);
    const [showClearDialog, setShowClearDialog] = useState(false);

    // Redux
    const dispatch = useDispatch();
    const savedFormData = useSelector((state: RootState) =>
        state.familyBackground.forms[ocId]
    );

    // API operations
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

    // React Hook Form
    const familyForm = useForm<FormValues>({
        defaultValues: {
            family: savedFormData && savedFormData.length > 0
                ? savedFormData
                : [{ name: "", relation: "", age: "", occupation: "", education: "", mobileNo: "" }],
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

    // Auto-save to Redux on form changes
    useEffect(() => {
        const subscription = familyForm.watch((value) => {
            if (value.family && value.family.length > 0) {
                const formData = value.family.map(member => ({
                    name: member?.name || "",
                    relation: member?.relation || "",
                    age: member?.age ?? "", // Use ?? to handle both string and number
                    occupation: member?.occupation || "",
                    education: member?.education || "",
                    mobileNo: member?.mobileNo || "",
                }));
                dispatch(saveFamilyForm({ ocId, data: formData }));
            }
        });
        return () => subscription.unsubscribe();
    }, [familyForm, dispatch, ocId]);

    const submitFamily = async (values: FormValues) => {
        const { family: newMembers } = values;

        // Filter out completely empty rows
        const filledMembers = newMembers.filter(member =>
            member.name && member.name.trim() !== ""
        );

        if (filledMembers.length === 0) {
            toast.error("Please add at least one family member");
            return;
        }

        // Validate fields
        for (let i = 0; i < filledMembers.length; i++) {
            const m = filledMembers[i];
            if (!m.relation || m.relation.trim() === "") {
                toast.error(`Row ${i + 1}: Relation is required`);
                return;
            }
            if (m.age && m.age.toString().trim() !== "") {
                const age = Number(m.age);
                if (!Number.isInteger(age) || age < 0 || age > 150) {
                    toast.error(`Row ${i + 1}: Age must be a number between 0 and 150`);
                    return;
                }
            }
            if (m.mobileNo && m.mobileNo.trim() !== "") {
                if (!/^\d{10}$/.test(m.mobileNo.trim())) {
                    toast.error(`Row ${i + 1}: Mobile number must be exactly 10 digits`);
                    return;
                }
            }
        }

        try {
            const saved = await saveFamily(filledMembers);

            if (saved && saved.length > 0) {
                toast.success("Family details saved successfully!");
                // Clear Redux cache after successful save
                dispatch(clearFamilyForm(ocId));
                // Reset form to default state
                familyForm.reset({
                    family: [{ name: "", relation: "", age: "", occupation: "", education: "", mobileNo: "" }]
                });
                fetchFamily();
            }
        } catch {
            toast.error("Error saving family details.");
        }
    };

    // Clear form handler
    const handleClearForm = () => setShowClearDialog(true);
    const confirmClearForm = () => {
        dispatch(clearFamilyForm(ocId));
        familyForm.reset({
            family: [{ name: "", relation: "", age: "", occupation: "", education: "", mobileNo: "" }]
        });
        toast.info("Form cleared");
        setShowClearDialog(false);
    };

    // Editing handlers
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
        } finally {
            setDeleteTarget(null);
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
                    setDeleteTarget(row);
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

            {/* SAVED TABLE */}
            <div className="mb-6 border rounded-lg shadow">
                <UniversalTable<FamilyMemberRecord>
                    data={family}
                    config={config}
                />
            </div>

            {/* ADD NEW FORM */}
            <form onSubmit={familyForm.handleSubmit(submitFamily)}>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border border-border">
                        <thead className="bg-muted/70">
                            <tr>
                                {["S.No", "Name", "Relation", "Age", "Occupation", "Edn Qual", "Mobile", "Action"].map((head) => (
                                    <th key={head} className="border px-4 py-2 bg-muted">
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
                                        <Button
                                            variant="destructive"
                                            type="button"
                                            size="sm"
                                            onClick={() => remove(index)}
                                        >
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

                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClearForm}
                    >
                        Clear Form
                    </Button>

                    <Button type="submit" className="bg-success">
                        Save
                    </Button>
                </div>

                {savedFormData && savedFormData.length > 0 && (
                    <p className="text-sm text-muted-foreground text-center mt-2">
                        * Changes are automatically saved
                    </p>
                )}
            </form>

            {/* DELETE CONFIRMATION DIALOG */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Family Member</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete{deleteTarget?.name ? ` "${deleteTarget.name}"` : " this family member"}? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-primary-foreground hover:bg-destructive/90"
                            onClick={() => deleteTarget && deleteMember(deleteTarget)}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* CLEAR FORM CONFIRMATION DIALOG */}
            <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear Form</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to clear all unsaved changes? This will reset the form.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmClearForm}>Clear</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}