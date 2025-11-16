"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import {
    getEducationDetails,
    saveEducationDetails,
    updateEducationRecord,
    deleteEducationRecord,
    EducationItem,
    EducationUI,
    EducationRecordResponse,
} from "@/app/lib/api/educationApi";
import { Qualification } from "@/types/background-detls";

export default function EducationQualifications({ selectedCadet }: { selectedCadet: any }) {
    const [savedEducation, setSavedEducation] = useState<EducationItem[]>([]);
    const [editingEduId, setEditingEduId] = useState<string | null>(null);
    const [editEduForm, setEditEduForm] = useState<EducationUI | null>(null);

    // ---------------------------
    // FETCH EDUCATION DATA
    // ---------------------------
    const fetchEducationData = useCallback(async () => {
        if (!selectedCadet?.ocId) return;

        try {
            const data = await getEducationDetails(selectedCadet.ocId);
            if (Array.isArray(data)) {
                const formatted = data.map((item: EducationRecordResponse) => ({
                    id: item.id,
                    qualification: item.level || "",
                    school: item.schoolOrCollege || "",
                    subs: item.subjects || "",
                    board: item.boardOrUniv || "",
                    marks: item.totalPercent ? item.totalPercent.toString() : "",
                    grade: "",
                }));
                setSavedEducation(formatted);
            }
        } catch (err) {
            toast.error("Failed to fetch education details");
        }
    }, [selectedCadet?.ocId]);

    useEffect(() => {
        fetchEducationData();
    }, [fetchEducationData]);

    // ---------------------------
    // ADD FORM - RHF
    // ---------------------------
    const qualificationForm = useForm<{ qualifications: Qualification[] }>({
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

    const submitQualifications = async (data: { qualifications: Qualification[] }) => {
        if (!selectedCadet?.ocId) {
            return toast.error("No cadet selected");
        }

        try {
            const payload = data.qualifications.map((q) => ({
                level: q.qualification,
                school: q.school,
                board: q.board,
                subjects: q.subs,
                percentage: q.marks ? Number(q.marks) : 0,
            }));

            const responses = await saveEducationDetails(selectedCadet.ocId, payload);

            if (responses.length > 0) {
                toast.success("Education details saved!");
                await fetchEducationData(); // REFRESH FROM BACKEND
            }
        } catch (err) {
            toast.error("Failed to save qualifications");
        }
    };

    // ---------------------------
    // EDIT HANDLERS
    // ---------------------------
    const handleEdit = (row: EducationUI) => {
        setEditingEduId(row.id);
        setEditEduForm({ ...row });
    };

    const handleCancelEdit = () => {
        setEditingEduId(null);
        setEditEduForm(null);
    };

    const handleChange = (field: keyof EducationUI, value: any) => {
        setEditEduForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    };

    const handleSave = async () => {
        if (!selectedCadet?.ocId || !editingEduId || !editEduForm)
            return toast.error("Invalid operation");

        try {
            await updateEducationRecord(selectedCadet.ocId, editingEduId, {
                totalPercent: editEduForm.marks ? Number(editEduForm.marks) : 0,
            });

            toast.success("Record updated!");

            await fetchEducationData(); // REFRESH FROM BACKEND

            setEditingEduId(null);
            setEditEduForm(null);
        } catch {
            toast.error("Failed to update");
        }
    };

    // ---------------------------
    // DELETE HANDLER
    // ---------------------------
    const handleDelete = async (row: EducationUI) => {
        if (!selectedCadet?.ocId || !row.id)
            return toast.error("Invalid record");

        try {
            await deleteEducationRecord(selectedCadet.ocId, row.id);

            toast.success("Deleted successfully!");
            await fetchEducationData();
        } catch {
            toast.error("Failed to delete");
        }
    };

    return (
        <div>
            {/* SAVED EDUCATION TABLE */}
            <div className="overflow-x-auto mb-6 border rounded-lg shadow">
                {savedEducation.length === 0 ? (
                    <p className="text-center p-4 text-gray-500">No educational qualifications saved yet.</p>
                ) : (
                    <table className="min-w-full text-sm border border-gray-300">
                        <thead className="bg-gray-100">
                            <tr>
                                {["S.No", "Qualification", "School", "Subs", "Board", "Marks", "Grade", "Action"].map(
                                    (head) => (
                                        <th key={head} className="border px-4 py-2 text-center bg-gray-300">
                                            {head}
                                        </th>
                                    )
                                )}
                            </tr>
                        </thead>

                        <tbody>
                            {savedEducation.map((row, idx) => {
                                const isEditing = editingEduId === row.id;
                                return (
                                    <tr key={row.id}>
                                        <td className="border px-4 py-2 text-center">{idx + 1}</td>

                                        {/* QUALIFICATION */}
                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    value={editEduForm?.qualification}
                                                    onChange={(e) => handleChange("qualification", e.target.value)}
                                                />
                                            ) : (
                                                row.qualification
                                            )}
                                        </td>

                                        {/* SCHOOL */}
                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input value={editEduForm?.school} onChange={(e) => handleChange("school", e.target.value)} />
                                            ) : (
                                                row.school
                                            )}
                                        </td>

                                        {/* SUBJECT */}
                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input value={editEduForm?.subs} onChange={(e) => handleChange("subs", e.target.value)} />
                                            ) : (
                                                row.subs
                                            )}
                                        </td>

                                        {/* BOARD */}
                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input value={editEduForm?.board} onChange={(e) => handleChange("board", e.target.value)} />
                                            ) : (
                                                row.board
                                            )}
                                        </td>

                                        {/* MARKS */}
                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    value={editEduForm?.marks}
                                                    onChange={(e) => handleChange("marks", e.target.value)}
                                                />
                                            ) : (
                                                row.marks
                                            )}
                                        </td>

                                        {/* GRADE */}
                                        <td className="border px-4 py-2">
                                            {isEditing ? (
                                                <Input value={editEduForm?.grade} onChange={(e) => handleChange("grade", e.target.value)} />
                                            ) : (
                                                row.grade
                                            )}
                                        </td>

                                        {/* ACTION BUTTONS */}
                                        <td className="border px-4 py-2 text-center space-x-2">
                                            {!isEditing ? (
                                                <>
                                                    <Button size="sm" variant="outline" onClick={() => handleEdit(row)}>
                                                        Edit
                                                    </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleDelete(row)}>
                                                        Delete
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button size="sm" onClick={handleSave}>Save</Button>
                                                    <Button size="sm" variant="outline" onClick={handleCancelEdit}>
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
                )}
            </div>

            {/* ADD NEW EDUCATION FORM */}
            <form onSubmit={qualificationForm.handleSubmit(submitQualifications)}>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border border-gray-300">
                        <thead className="bg-gray-100">
                            <tr>
                                {["S.No", "Qualification", "School", "Subs", "Board", "Marks", "Grade", "Action"].map(
                                    (head) => (
                                        <th key={head} className="border px-4 py-2 bg-gray-300">
                                            {head}
                                        </th>
                                    )
                                )}
                            </tr>
                        </thead>

                        <tbody>
                            {fields.map((item, idx) => (
                                <tr key={item.id}>
                                    <td className="border px-4 py-2 text-center">{idx + 1}</td>

                                    {["qualification", "school", "subs", "board", "marks", "grade"].map((field) => (
                                        <td key={field} className="border px-4 py-2">
                                            <Input
                                                {...qualificationForm.register(`qualifications.${idx}.${field}`)}
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

                <div className="flex justify-center gap-2 mt-4">
                    <Button
                        type="button"
                        onClick={() => append({ qualification: "", school: "", subs: "", board: "", marks: "", grade: "" })}
                    >
                        Add Qualification
                    </Button>
                    <Button type="submit">Save</Button>
                </div>
            </form>
        </div>
    );
}