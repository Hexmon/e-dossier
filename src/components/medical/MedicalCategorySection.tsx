"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import { useMedicalCategory } from "@/hooks/useMedicalCategory";
import { MedCatRow } from "@/types/med-records";

import MedicalCategoryTable from "./MedicalCategoryTable";
import MedicalCategoryForm from "./MedicalCategoryForm";
import type { MedicalCategoryFormData } from "@/types/med-records";

interface Props {
    selectedCadet: {
        ocId: string;
        name: string;
        courseName: string;
        ocNumber: string;
        course: string;
    };
    semesters: string[];
}

export default function MedicalCategorySection({ selectedCadet, semesters }: Props) {
    const { ocId = "" } = selectedCadet;

    const {
        items: records,
        loading,
        fetch: fetchRecords,
        save: saveRecords,
        update: updateRecord,
        remove: deleteRecord,
    } = useMedicalCategory(ocId);

    const [activeTab, setActiveTab] = useState(0);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<MedCatRow | null>(null);

    const loadData = useCallback(async () => {
        await fetchRecords();
    }, [fetchRecords]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const submitNew = async (data: MedicalCategoryFormData) => {
        console.log("form raw data:", data);
        const { records: newRows } = data;
        const payload = newRows.map((row) => ({
            semester: activeTab + 1,
            date: row.date ?? "",
            mosAndDiagnostics: row.diagnosis ?? "",
            catFrom: row.catFrom ?? "",
            catTo: row.catTo ?? "",
            mhFrom: row.mhFrom ?? "",
            mhTo: row.mhTo ?? "",
            absence: row.absence ?? "",
            platoonCommanderName: row.piCdrInitial ?? "",
        }));
        const saved = await saveRecords(payload);

        if (saved) {
            toast.success("MED CAT saved!");
            fetchRecords();
        }
    };

    const startEdit = (row: MedCatRow) => {
        setEditingId(row.id ?? "");
        setEditForm({ ...row });
    };

    const changeEdit = <K extends keyof MedCatRow>(key: K, value: MedCatRow[K]) => {
        setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    };

    const saveEdit = async () => {
        if (!editingId || !editForm) return;

        const {
            date = "",
            diagnosis = "",
            catFrom = "",
            catTo = "",
            mhFrom = "",
            mhTo = "",
            absence = "",
            piCdrInitial = "",
        } = editForm;

        const payload = {
            date,
            mosAndDiagnostics: diagnosis,
            catFrom,
            catTo,
            mhFrom,
            mhTo,
            absence,
            platoonCommanderName: piCdrInitial,
        };

        await updateRecord(editingId, payload);

        toast.success("Record updated!");

        setEditingId(null);
        setEditForm(null);
        fetchRecords();
    };

    const removeRow = async (row: MedCatRow) => {
        const { id = "" } = row;

        await deleteRecord(id);
        toast.success("Deleted");
        fetchRecords();
    };

    const filtered = records.filter(
        ({ semester }) => semester === activeTab + 1
    );

    return (
        <Card className="p-6 shadow-lg rounded-xl max-w-6xl mx-auto">
            <CardHeader>
                <CardTitle className="text-xl font-semibold text-center text-primary">
                    MEDICAL CATEGORY (MED CAT)
                </CardTitle>
            </CardHeader>

            <CardContent>
                <div className="flex justify-center mb-6 space-x-2">
                    {semesters.map((sem, idx) => {
                        return (
                            <button
                                key={sem}
                                onClick={() => setActiveTab(idx)}
                                className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === idx ? "bg-blue-600 text-white" : "bg-gray-200"
                                    }`}
                            >
                                {sem}
                            </button>
                        )
                    })}
                </div>

                <MedicalCategoryTable
                    rows={filtered}
                    editingId={editingId}
                    editForm={editForm}
                    onEdit={startEdit}
                    onChange={changeEdit}
                    onSave={saveEdit}
                    onCancel={() => { setEditingId(null); setEditForm(null); }}
                    onDelete={removeRow}
                />

                <MedicalCategoryForm onSubmit={submitNew} />
                <p className="text-xs text-gray-600 mt-4 italic">
                    * Name of hospital must be written in PI Cdr Initial field.
                </p>
            </CardContent>
        </Card>
    );
}
