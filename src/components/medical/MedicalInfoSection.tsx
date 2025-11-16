"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

import {
    getMedicalInfo,
    saveMedicalInfo,
    updateMedicalInfo,
    deleteMedicalInfo,
} from "@/app/lib/api/medinfoApi";

import { MedInfoRow, MedicalInfoForm } from "@/types/med-records";

export default function MedicalInfoSection({
    selectedCadet,
    semesters,
}: {
    selectedCadet: any;
    semesters: string[];
}) {
    const [activeTab, setActiveTab] = useState(0);
    const [savedMedInfo, setSavedMedInfo] = useState<MedInfoRow[]>([]);
    const [loading, setLoading] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<MedInfoRow | null>(null);

    const form = useForm<MedicalInfoForm>({
        defaultValues: {
            medInfo: [
                { date: "", age: "", height: "", ibw: "", abw: "", overw: "", bmi: "", chest: "" },
            ],
            medicalHistory: "",
            medicalIssues: "",
            allergies: "",
        },
    });

    const { control, handleSubmit, register, reset } = form;

    const { fields, append, remove } = useFieldArray({
        control,
        name: "medInfo",
    });

    // --------------------------- FETCH ---------------------------
    const fetchMedicalInfo = useCallback(async () => {
        if (!selectedCadet?.ocId) return;

        try {
            setLoading(true);
            const data = await getMedicalInfo(selectedCadet.ocId);
            console.log("backend medical info:", data);

            const formatted = data.map((item) => ({
                id: item.id,
                term: semesters[item.semester - 1],
                date: (item.date ?? item.examDate ?? "").split("T")[0],
                age: String(item.age ?? ""),
                height: String(item.heightCm ?? ""),
                ibw: String(item.ibwKg ?? ""),
                abw: String(item.abwKg ?? ""),
                overw: String(item.overwtPct ?? ""),
                bmi: String(item.bmi ?? ""),
                chest: String(item.chestCm ?? ""),
            }));

            setSavedMedInfo(formatted);
        } catch (err) {
            toast.error("Failed to load medical info.");
        } finally {
            setLoading(false);
        }
    }, [selectedCadet?.ocId, semesters]);

    useEffect(() => {
        fetchMedicalInfo();
    }, [fetchMedicalInfo]);

    // --------------------------- SAVE NEW ROWS ---------------------------
    const onSubmit = async (data: MedicalInfoForm) => {
        if (!selectedCadet?.ocId) return toast.error("No cadet selected");

        try {
            const payload = data.medInfo.map((r) => ({
                semester: activeTab + 1,
                examDate: typeof r.date === "string" ? r.date : null,
                age: Number(r.age),
                heightCm: Number(r.height),
                ibwKg: Number(r.ibw),
                abwKg: Number(r.abw),
                overweightPct: Number(r.overw),
                bmi: Number(r.bmi),
                chestCm: Number(r.chest),
                medicalHistory: data.medicalHistory || "",
                hereditaryIssues: data.medicalIssues || "",
                allergies: data.allergies || "",
            }));

            const response = await saveMedicalInfo(selectedCadet.ocId, payload);

            if (response) {
                toast.success(`Medical Info for ${semesters[activeTab]} saved`);
                await fetchMedicalInfo();
            }
            if (!Array.isArray(response)) return toast.error("Save failed");

            reset();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save medical info.");
        }
    };

    // --------------------------- EDIT HANDLERS ---------------------------
    const handleEdit = (row: MedInfoRow) => {
        setEditingId(row.id ?? null);
        setEditForm({ ...row });
    };

    const handleChange = (field: keyof MedInfoRow, value: any) => {
        setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    };

    const handleSave = async () => {
        if (!editingId || !editForm || !selectedCadet?.ocId)
            return toast.error("Invalid operation");

        const payload = {
            examDate: editForm.date,
            age: Number(editForm.age),
            heightCm: Number(editForm.height),
            ibwKg: Number(editForm.ibw),
            abwKg: Number(editForm.abw),
            overweightPct: Number(editForm.overw),
            bmi: Number(editForm.bmi),
            chestCm: Number(editForm.chest),
        };

        try {
            await updateMedicalInfo(selectedCadet.ocId, editingId, payload);

            setSavedMedInfo((prev) =>
                prev.map((r) => (r.id === editingId ? editForm : r))
            );

            toast.success("Record updated");
            setEditingId(null);
            setEditForm(null);
        } catch {
            toast.error("Failed to update");
        }
    };

    const handleDelete = (row: MedInfoRow) => {
        if (!row.id || !selectedCadet?.ocId) return toast.error("Invalid record");

        toast.warning("Are you sure you want to delete this record?", {
            action: {
                label: "Delete",
                onClick: async () => {
                    try {
                        await deleteMedicalInfo(selectedCadet.ocId, row.id);

                        setSavedMedInfo(prev => prev.filter(r => r.id !== row.id));
                        toast.success("Record deleted");
                    } catch {
                        toast.error("Failed to delete record");
                    }
                },
            },
            cancel: {
                label: "Cancel",
            },
        });
    };


    // --------------------------- RENDER ---------------------------
    return (
        <Card className="p-6 shadow-lg rounded-xl max-w-6xl mx-auto">
            <CardHeader>
                <CardTitle className="text-xl font-semibold text-center text-primary">
                    Medical Information Form
                </CardTitle>
            </CardHeader>

            <CardContent>
                {/* TERM SELECTOR */}
                <div className="flex justify-center mb-6 space-x-2">
                    {semesters.map((s, i) => (
                        <button
                            key={s}
                            onClick={() => setActiveTab(i)}
                            className={`px-4 py-2 rounded-t-lg ${activeTab === i ? "bg-blue-600 text-white" : "bg-gray-200"
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                {/* SAVED TABLE */}
                {loading ? (
                    <p className="text-center">Loading...</p>
                ) : (
                    (() => {
                        const filtered = savedMedInfo.filter((r) => r.term === semesters[activeTab]);

                        if (filtered.length === 0)
                            return <p className="text-center text-gray-500">No records yet.</p>;

                        return (
                            <div className="overflow-x-auto mb-6 border rounded-lg shadow">
                                <table className="w-full border text-sm">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            {[
                                                "Date",
                                                "Age",
                                                "Height",
                                                "IBW",
                                                "ABW",
                                                "Overwt",
                                                "BMI",
                                                "Chest",
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
                                                    {/* DATE */}
                                                    <td className="border p-2 text-center">
                                                        {isEditing ? (
                                                            <Input
                                                                type="date"
                                                                value={editForm?.date ?? ""}
                                                                onChange={(e) => handleChange("date", e.target.value)}
                                                            />
                                                        ) : (
                                                            row.date
                                                        )}
                                                    </td>

                                                    {/* AGE */}
                                                    <td className="border p-2 text-center">
                                                        {isEditing ? (
                                                            <Input
                                                                value={editForm?.age ?? ""}
                                                                onChange={(e) => handleChange("age", e.target.value)}
                                                            />
                                                        ) : (
                                                            row.age
                                                        )}
                                                    </td>

                                                    {/* other columns similar */}
                                                    {["height", "ibw", "abw", "overw", "bmi", "chest"].map((f) => (
                                                        <td key={f} className="border p-2 text-center">
                                                            {isEditing ? (
                                                                <Input
                                                                    value={(editForm as any)[f] ?? ""}
                                                                    onChange={(e) => handleChange(f as any, e.target.value)}
                                                                />
                                                            ) : (
                                                                (row as any)[f]
                                                            )}
                                                        </td>
                                                    ))}

                                                    {/* ACTIONS */}
                                                    <td className="border p-2 text-center">
                                                        {!isEditing ? (
                                                            <>
                                                                <Button size="sm" variant="outline" onClick={() => handleEdit(row)} className="cursor-pointer">
                                                                    Edit
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() => handleDelete(row)}
                                                                    className="cursor-pointer"
                                                                >
                                                                    Delete
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Button size="sm" onClick={handleSave} className="cursor-pointer">
                                                                    Save
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setEditingId(null);
                                                                        setEditForm(null);
                                                                    }}
                                                                    className="cursor-pointer"
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
                )}

                {/* ADD FORM */}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="overflow-x-auto">
                        <table className="w-full border text-sm">
                            <thead>
                                <tr>
                                    {["Date", "Age", "Ht", "IBW", "ABW", "Overwt", "BMI", "Chest", "Action"].map(
                                        (h) => (
                                            <th key={h} className="border p-2">
                                                {h}
                                            </th>
                                        )
                                    )}
                                </tr>
                            </thead>

                            <tbody>
                                {fields.map((field, i) => (
                                    <tr key={field.id}>
                                        {["date", "age", "height", "ibw", "abw", "overw", "bmi", "chest"].map((f) => (
                                            <td key={f} className="border p-2">
                                                <Input
                                                    {...register(`medInfo.${i}.${f}` as const)}
                                                    type={f === "date" ? "date" : "text"}
                                                />
                                            </td>
                                        ))}

                                        <td className="border p-2 text-center">
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => remove(i)}
                                                className="cursor-pointer"
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
                                    age: "",
                                    height: "",
                                    ibw: "",
                                    abw: "",
                                    overw: "",
                                    bmi: "",
                                    chest: "",
                                })
                            }
                        >
                            + Add Row
                        </Button>

                        <Button variant="outline" type="button" onClick={() => reset()}>
                            Reset
                        </Button>
                    </div>

                    {/* TEXT AREAS */}
                    <div className="mt-6 space-y-4">
                        <Textarea {...register("medicalHistory")} placeholder="Medical History" rows={3} />
                        <Textarea {...register("medicalIssues")} placeholder="Medical Issues" rows={3} />
                        <Textarea {...register("allergies")} placeholder="Allergies" rows={3} />
                    </div>

                    <div className="flex justify-center mt-4">
                        <Button type="submit" className="w-64 bg-blue-600 cursor-pointer">
                            Submit Medical Info
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
