"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

import {
    getMedicalCategory,
    saveMedicalCategory,
    updateMedicalCategory,
    deleteMedicalCategory,
} from "@/app/lib/api/medCatApi";

import { MedCatRow, MedicalCategoryForm } from "@/types/med-records";

export default function MedicalCategorySection({
    selectedCadet,
    semesters,
}: {
    selectedCadet: any;
    semesters: string[];
}) {
    const [activeTab, setActiveTab] = useState(0);
    const [savedMedCats, setSavedMedCats] = useState<MedCatRow[]>([]);
    const [loading, setLoading] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<MedCatRow | null>(null);

    const form = useForm<MedicalCategoryForm>({
        defaultValues: {
            records: [
                {
                    date: "",
                    diagnosis: "",
                    catFrom: "",
                    catTo: "",
                    mhFrom: "",
                    mhTo: "",
                    absence: "",
                    piCdrInitial: "",
                },
            ],
        },
    });

    const { control, handleSubmit, register, reset } = form;

    const { fields, append, remove } = useFieldArray({
        control,
        name: "records",
    });

    // --------------------------- FETCH ---------------------------
    const fetchMedicalCategory = useCallback(async () => {
        if (!selectedCadet?.ocId) return;

        try {
            setLoading(true);
            const data = await getMedicalCategory(selectedCadet.ocId);

            const formatted = data.map((item) => ({
                id: item.id,
                term: semesters[item.semester - 1] || `TERM ${item.semester}`,
                date: item.date?.split("T")[0] || "",
                diagnosis: item.mosAndDiagnostics || "",
                catFrom: item.catFrom?.split("T")[0] || "",
                catTo: item.catTo?.split("T")[0] || "",
                mhFrom: item.mhFrom?.split("T")[0] || "",
                mhTo: item.mhTo?.split("T")[0] || "",
                absence: item.absence || "",
                piCdrInitial: item.platoonCommanderName || "",
            }));

            setSavedMedCats(formatted);
        } catch {
            toast.error("Failed to load MED CAT records");
        } finally {
            setLoading(false);
        }
    }, [selectedCadet?.ocId, semesters]);

    useEffect(() => {
        fetchMedicalCategory();
    }, [fetchMedicalCategory]);

    // --------------------------- SAVE NEW ROWS ---------------------------
    const onSubmit = async (data: MedicalCategoryForm) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        try {
            const payload = data.records.map((r) => ({
                semester: activeTab + 1,
                date: r.date,
                mosAndDiagnostics: r.diagnosis || "",
                catFrom: r.catFrom || "",
                catTo: r.catTo || "",
                mhFrom: r.mhFrom || "",
                mhTo: r.mhTo || "",
                absence: r.absence || "",
                platoonCommanderName: r.piCdrInitial || "",
            }));

            const response = await saveMedicalCategory(selectedCadet.ocId, payload);

            if (!Array.isArray(response)) return toast.error("Failed to save");

            toast.success(`MED CAT for ${semesters[activeTab]} saved!`);

            // Immediately fetch original backend data
            await fetchMedicalCategory();
            reset();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save MED CAT");
        }
    };

    // --------------------------- EDIT ---------------------------
    const handleEdit = (row: MedCatRow) => {
        setEditingId(row.id ?? null);
        setEditForm({ ...row });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm(null);
    };

    const handleChange = (field: keyof MedCatRow, value: any) => {
        setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    };

    const handleSave = async () => {
        if (!selectedCadet?.ocId || !editingId || !editForm)
            return toast.error("Invalid operation");

        const payload = {
            date: editForm.date,
            mosAndDiagnostics: editForm.diagnosis,
            catFrom: editForm.catFrom,
            catTo: editForm.catTo,
            mhFrom: editForm.mhFrom,
            mhTo: editForm.mhTo,
            absence: editForm.absence,
            platoonCommanderName: editForm.piCdrInitial,
        };

        try {
            await updateMedicalCategory(selectedCadet.ocId, editingId, payload);

            toast.success("MED CAT updated!");

            await fetchMedicalCategory();

            setEditingId(null);
            setEditForm(null);
        } catch {
            toast.error("Failed to update MED CAT");
        }
    };

    // --------------------------- DELETE ---------------------------
    const handleDelete = (row: MedCatRow) => {
        if (!selectedCadet?.ocId || !row.id)
            return toast.error("Invalid record");

        toast.warning("Are you sure you want to delete this MED CAT record?", {
            action: {
                label: "Delete",
                onClick: async () => {
                    try {
                        await deleteMedicalCategory(selectedCadet.ocId, row.id as string);

                        toast.success("MED CAT deleted!");
                        await fetchMedicalCategory();
                    } catch {
                        toast.error("Failed to delete record");
                    }
                },
            },
            cancel: {
                label: "Cancel",
                onClick: () => {},
            },
        });
    };

    // --------------------------- RENDER ---------------------------
    return (
        <Card className="p-6 shadow-lg rounded-xl max-w-6xl mx-auto">
            <CardHeader>
                <CardTitle className="text-xl font-semibold text-center text-primary">
                    MEDICAL CATEGORY (MED CAT) RECORD
                </CardTitle>
            </CardHeader>

            <CardContent>
                {/* TERM SELECTOR */}
                <div className="flex justify-center mb-6 space-x-2">
                    {semesters.map((sem, idx) => (
                        <button
                            key={sem}
                            onClick={() => setActiveTab(idx)}
                            className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === idx
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-700"
                                }`}
                        >
                            {sem}
                        </button>
                    ))}
                </div>

                {/* SAVED TABLE */}
                {loading ? (
                    <p className="text-center text-gray-500">Loading...</p>
                ) : (() => {
                    const filtered = savedMedCats.filter(
                        (row) => row.term === semesters[activeTab]
                    );

                    if (filtered.length === 0)
                        return (
                            <p className="text-center mb-4 text-gray-500">
                                No MED CAT data saved yet for {semesters[activeTab]}.
                            </p>
                        );

                    return (
                        <div className="overflow-x-auto mb-6 border rounded-lg shadow">
                            <table className="w-full border text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        {[
                                            "Date",
                                            "Diagnosis",
                                            "Cat From",
                                            "Cat To",
                                            "MH From",
                                            "MH To",
                                            "Absence",
                                            "PI Cdr Initial",
                                            "Action",
                                        ].map((h) => (
                                            <th key={h} className="border p-2 text-center">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody>
                                    {filtered.map((row) => {
                                        const isEditing = editingId === row.id;

                                        return (
                                            <tr key={row.id}>
                                                {/* Render editable or plain cells */}
                                                {[
                                                    "date",
                                                    "diagnosis",
                                                    "catFrom",
                                                    "catTo",
                                                    "mhFrom",
                                                    "mhTo",
                                                    "absence",
                                                    "piCdrInitial",
                                                ].map((field) => (
                                                    <td key={field} className="border p-2 text-center">
                                                        {isEditing ? (
                                                            <Input
                                                                value={(editForm as any)[field] ?? ""}
                                                                type={
                                                                    ["date", "catFrom", "catTo", "mhFrom", "mhTo"].includes(field)
                                                                        ? "date"
                                                                        : "text"
                                                                }
                                                                className={`h-7 text-xs px-2 ${["date", "catFrom", "catTo", "mhFrom", "mhTo"].includes(field) ? "w-[90px]" : "w-full"} `}
                                                                onChange={(e) => handleChange(field as any, e.target.value)}
                                                            />
                                                        ) : (
                                                            (row as any)[field]
                                                        )}
                                                    </td>
                                                ))}

                                                {/* ACTION BUTTONS */}
                                                <td className="border p-2 text-center space-x-2">
                                                    {!isEditing ? (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleEdit(row)}
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => handleDelete(row)}
                                                            >
                                                                Delete
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button size="sm" onClick={handleSave}>
                                                                Save
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={handleCancel}
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
                    );
                })()
                }

                {/* FORM FOR ADDING NEW ROWS */}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="overflow-x-auto border rounded-lg shadow">
                        <table className="w-full border text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    {[
                                        "Date",
                                        "Diagnosis",
                                        "Cat From",
                                        "Cat To",
                                        "MH From",
                                        "MH To",
                                        "Absence",
                                        "PI Cdr Initial",
                                        "Action",
                                    ].map((h) => (
                                        <th key={h} className="border p-2">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {fields.map((field, index) => (
                                    <tr key={field.id}>
                                        {Object.keys(field)
                                            .filter((key) => key !== "id")
                                            .map((key) => (
                                                <td key={key} className="border p-2">
                                                    <Input
                                                        {...register(`records.${index}.${key}` as any)}
                                                        type={["date", "catFrom", "catTo", "mhFrom", "mhTo"].includes(key) ? "date" : "text"}
                                                        className={` h-7 text-xs px-2 ${["date", "catFrom", "catTo", "mhFrom", "mhTo"].includes(key) ? "w-[90px]" : "w-full"}`}
                                                    />
                                                </td>
                                            ))}

                                        <td className="border p-2 text-center">
                                            <Button
                                                type="button"
                                                variant="destructive"
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

                    <div className="mt-4 flex justify-center gap-3">
                        <Button
                            type="button"
                            onClick={() =>
                                append({
                                    date: "",
                                    diagnosis: "",
                                    catFrom: "",
                                    catTo: "",
                                    mhFrom: "",
                                    mhTo: "",
                                    absence: "",
                                    piCdrInitial: "",
                                })
                            }
                        >
                            + Add Row
                        </Button>
                        <Button type="submit" className="bg-blue-600">
                            Submit MED CAT
                        </Button>
                        <Button type="button" variant="outline" onClick={() => reset()}>
                            Reset
                        </Button>
                    </div>

                    <p className="text-xs text-gray-600 mt-4 italic">
                        * Name of hospital must be indicated in the PI Cdr Initial field.
                    </p>
                </form>
            </CardContent>
        </Card>
    );
}
