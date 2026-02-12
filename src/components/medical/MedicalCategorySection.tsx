"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

import { useMedicalCategory } from "@/hooks/useMedicalCategory";
import { MedCatRow } from "@/types/med-records";

import MedicalCategoryTable from "./MedicalCategoryTable";
import MedicalCategoryForm from "./MedicalCategoryForm";
import type { MedicalCategoryFormData } from "@/types/med-records";

import type { RootState } from "@/store";
import { clearMedicalCategoryForm } from "@/store/slices/medicalCategorySlice";

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
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Redux
    const dispatch = useDispatch();
    const savedFormData = useSelector((state: RootState) =>
        state.medicalCategory.forms[ocId]
    );

    const {
        items: records,
        loading,
        fetch: fetchRecords,
        save: saveRecords,
        update: updateRecord,
        remove: deleteRecord,
    } = useMedicalCategory(ocId);

    const semParam = searchParams.get("semester");
    const resolvedTab = useMemo(() => {
        const parsed = Number(semParam);
        if (!Number.isFinite(parsed)) return 0;
        const idx = parsed - 1;
        if (idx < 0 || idx >= semesters.length) return 0;
        return idx;
    }, [semParam, semesters.length]);
    const [activeTab, setActiveTab] = useState(resolvedTab);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<MedCatRow | null>(null);

    useEffect(() => {
        setActiveTab(resolvedTab);
    }, [resolvedTab]);

    const updateSemesterParam = (index: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("semester", String(index + 1));
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const handleSemesterChange = (index: number) => {
        setActiveTab(index);
        updateSemesterParam(index);
    };

    const loadData = useCallback(async () => {
        await fetchRecords();
    }, [fetchRecords]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const submitNew = async (data: MedicalCategoryFormData) => {
        console.log("form raw data:", data);
        const { records: newRows } = data;

        // Filter out empty rows
        const filledRows = newRows.filter(row => {
            const hasData =
                (row.date && row.date.trim() !== "") ||
                (row.diagnosis && row.diagnosis.trim() !== "") ||
                (row.catFrom && row.catFrom.trim() !== "") ||
                (row.catTo && row.catTo.trim() !== "") ||
                (row.mhFrom && row.mhFrom.trim() !== "") ||
                (row.mhTo && row.mhTo.trim() !== "") ||
                (row.absence && row.absence.trim() !== "") ||
                (row.piCdrInitial && row.piCdrInitial.trim() !== "");
            return hasData;
        });

        if (filledRows.length === 0) {
            toast.error("Please fill in at least one medical category record with data");
            return;
        }

        // Validate that filled rows have required fields
        const invalidRows = filledRows.filter(row =>
            !row.date || row.date.trim() === "" ||
            !row.diagnosis || row.diagnosis.trim() === ""
        );

        if (invalidRows.length > 0) {
            toast.error("Date and Diagnosis are required for all records");
            return;
        }

        const payload = filledRows.map((row) => ({
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

            // Clear Redux cache after successful save
            dispatch(clearMedicalCategoryForm(ocId));

            fetchRecords();
        }
    };

    const handleClearForm = () => {
        if (confirm("Are you sure you want to clear all unsaved changes?")) {
            dispatch(clearMedicalCategoryForm(ocId));
            toast.info("Form cleared");
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

    // Get default values - prioritize Redux over empty form
    const getDefaultValues = (): MedicalCategoryFormData => {
        if (savedFormData && savedFormData.length > 0) {
            return {
                records: savedFormData,
            };
        }

        return {
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
        };
    };

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
                                onClick={() => handleSemesterChange(idx)}
                                className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === idx ? "bg-primary text-primary-foreground" : "bg-muted"
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

                <MedicalCategoryForm
                    key={`${ocId}-${savedFormData ? 'redux' : 'default'}`}
                    onSubmit={submitNew}
                    defaultValues={getDefaultValues()}
                    ocId={ocId}
                    onClear={handleClearForm}
                />

                <p className="text-xs text-muted-foreground mt-4 italic">
                    * Name of hospital must be written in PI Cdr Initial field.
                </p>
            </CardContent>
        </Card>
    );
}
