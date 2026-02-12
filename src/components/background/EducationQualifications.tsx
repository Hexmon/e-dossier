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

import { EducationUI, EducationItem } from "@/app/lib/api/educationApi";
import { useEducation } from "@/hooks/useEducation";
import { FormValues } from "@/types/educational-qual";
import { Props } from "@/types/family-background";
import type { RootState } from "@/store";
import { saveEducationForm, clearEducationForm } from "@/store/slices/educationQualificationSlice";
import { ApiClientError } from "@/app/lib/apiClient";

export default function EducationQualifications({ ocId, cadet }: Props) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<EducationUI | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<EducationUI | null>(null);
    const [showClearDialog, setShowClearDialog] = useState(false);

    // Redux
    const dispatch = useDispatch();
    const savedFormData = useSelector((state: RootState) =>
        state.educationQualification.forms[ocId]
    );

    // API operations
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

    // React Hook Form
    const qualificationForm = useForm<FormValues>({
        defaultValues: {
            qualifications: savedFormData && savedFormData.length > 0
                ? savedFormData
                : [{ qualification: "", school: "", subs: "", board: "", marks: "", grade: "" }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: qualificationForm.control,
        name: "qualifications",
    });

    const columns = ["qualification", "school", "subs", "board", "marks", "grade"] as const;
    type ColumnKey = typeof columns[number];

    // Auto-save to Redux on form changes
    useEffect(() => {
        const subscription = qualificationForm.watch((value) => {
            if (value.qualifications && value.qualifications.length > 0) {
                const formData = value.qualifications.map(qual => ({
                    qualification: qual?.qualification || "",
                    school: qual?.school || "",
                    subs: qual?.subs || "",
                    board: qual?.board || "",
                    marks: qual?.marks ?? "",
                    grade: qual?.grade || "",
                }));
                dispatch(saveEducationForm({ ocId, data: formData }));
            }
        });
        return () => subscription.unsubscribe();
    }, [qualificationForm, dispatch, ocId]);

    const submitQualifications = async ({ qualifications }: FormValues) => {
        // Filter out empty rows
        const filledQualifications = qualifications.filter(q =>
            q.qualification && q.qualification.trim() !== ""
        );

        if (filledQualifications.length === 0) {
            toast.error("Please add at least one qualification");
            return;
        }

        // Validate fields
        for (let i = 0; i < filledQualifications.length; i++) {
            const q = filledQualifications[i];
            if (!q.school || q.school.trim() === "") {
                toast.error(`Row ${i + 1}: School/College is required`);
                return;
            }
            if (q.marks && q.marks.toString().trim() !== "") {
                const v = q.marks.toString().trim();
                // Allow boolean values
                if (v !== "true" && v !== "false") {
                    const marks = parseFloat(v);
                    if (!Number.isFinite(marks) || marks < 0) {
                        toast.error(`Row ${i + 1}: Marks must be a valid number or Pass/Fail`);
                        return;
                    }
                }
            }
        }

        try {
            const payload = filledQualifications.map((q) => {
                const marksVal = q.marks?.toString().trim();
                let percentage: number | boolean = 0;
                if (marksVal === "true") percentage = true;
                else if (marksVal === "false") percentage = false;
                else if (marksVal) percentage = parseFloat(marksVal) || 0;

                return {
                    level: q.qualification,
                    school: q.school,
                    board: q.board,
                    subjects: q.subs,
                    grade: q.grade || "",
                    percentage,
                };
            });

            const saved = await saveEducation(payload);

            if (saved && saved.length > 0) {
                toast.success("Education details saved!");
                // Clear Redux cache after successful save
                dispatch(clearEducationForm(ocId));
                // Reset form to default state
                qualificationForm.reset({
                    qualifications: [{ qualification: "", school: "", subs: "", board: "", marks: "", grade: "" }]
                });
                fetchEducation();
            }
        } catch (err) {
            if (err instanceof ApiClientError) {
                toast.error(err.message);
                // Show field-level errors if available
                const issues = err.extras?.issues as any;
                if (issues?.fieldErrors) {
                    Object.entries(issues.fieldErrors).forEach(([field, msgs]: [string, any]) => {
                        if (Array.isArray(msgs)) msgs.forEach((m: string) => toast.error(`${field}: ${m}`));
                    });
                }
            } else {
                toast.error("Failed to save qualifications");
            }
        }
    };

    // Clear form handler
    const handleClearForm = () => setShowClearDialog(true);
    const confirmClearForm = () => {
        dispatch(clearEducationForm(ocId));
        qualificationForm.reset({
            qualifications: [
                {
                    qualification: "",
                    school: "",
                    subs: "",
                    board: "",
                    marks: "",
                    grade: "",
                },
            ],
        });
        toast.info("Form cleared");
        setShowClearDialog(false);
    };

    // Edit handlers
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
                level: editForm.qualification,
                schoolOrCollege: editForm.school,
                boardOrUniv: editForm.board,
                subjects: editForm.subs,
                grade: editForm.grade,
                totalPercent: editForm.marks || null,
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
        } finally {
            setDeleteTarget(null);
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
                    setDeleteTarget(row);
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
            {/* SAVED EDUCATION TABLE */}
            <div className="mb-6 border rounded-lg shadow">
                <UniversalTable<EducationUI>
                    data={education}
                    config={config}
                />
            </div>

            {/* ADD NEW QUALIFICATIONS FORM */}
            <form onSubmit={qualificationForm.handleSubmit(submitQualifications)}>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border border-border">
                        <thead className="bg-muted/70">
                            <tr>
                                {["S.No", "Qualification", "School", "Subs", "Board", "Marks", "Grade", "Action"].map((head) => {
                                    return (
                                        <th key={head} className="border px-4 py-2 bg-muted">
                                            {head}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>

                        <tbody>
                            {fields.map((row, index) => {
                                const { id } = row;
                                return (
                                    <tr key={id}>
                                        <td className="border px-4 py-2 text-center">{index + 1}</td>


                                        {columns.map((field: ColumnKey) => {
                                            if (field === "marks") {
                                                const marksVal = qualificationForm.watch(`qualifications.${index}.marks`);
                                                const isBool = marksVal === "true" || marksVal === "false";
                                                return (
                                                    <td key={field} className="border px-4 py-2">
                                                        <div className="flex gap-1 items-center">
                                                            {isBool ? (
                                                                <select
                                                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                                                                    value={marksVal}
                                                                    onChange={(e) =>
                                                                        qualificationForm.setValue(`qualifications.${index}.marks`, e.target.value)
                                                                    }
                                                                >
                                                                    <option value="true">Pass</option>
                                                                    <option value="false">Fail</option>
                                                                </select>
                                                            ) : (
                                                                <Input
                                                                    {...qualificationForm.register(`qualifications.${index}.marks`)}
                                                                    placeholder="marks"
                                                                    inputMode="decimal"
                                                                />
                                                            )}
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-xs px-1 shrink-0"
                                                                title={isBool ? "Switch to numeric" : "Switch to Pass/Fail"}
                                                                onClick={() =>
                                                                    qualificationForm.setValue(
                                                                        `qualifications.${index}.marks`,
                                                                        isBool ? "" : "true"
                                                                    )
                                                                }
                                                            >
                                                                {isBool ? "123" : "P/F"}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                );
                                            }
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
                        <AlertDialogTitle>Delete Education Record</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this education record? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-primary-foreground hover:bg-destructive/90"
                            onClick={() => deleteTarget && removeRow(deleteTarget)}
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
