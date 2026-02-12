"use client";

import { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

import {
    getMedicalInfo,
    saveMedicalInfo,
    updateMedicalInfo,
    deleteMedicalInfo,
    type MedicalInfoPayload,
} from "@/app/lib/api/medinfoApi";

import { MedInfoRow, MedicalInfoForm } from "@/types/med-records";
import { ApiClientError } from "@/app/lib/apiClient";

import MedicalInfoTable from "./MedicalInfoTable";
import MedicalInfoFormComponent from "./MedicalInfoForm";

import type { RootState } from "@/store";
import { clearMedicalInfoForm } from "@/store/slices/medicalInfoSlice";

const numericFieldConfig = [
    { key: "age", apiKey: "age", label: "Age" },
    { key: "height", apiKey: "heightCm", label: "Height" },
    { key: "ibw", apiKey: "ibwKg", label: "IBW" },
    { key: "abw", apiKey: "abwKg", label: "ABW" },
    { key: "overw", apiKey: "overwtPct", label: "Overwt" },
    { key: "bmi", apiKey: "bmi", label: "BMI" },
    { key: "chest", apiKey: "chestCm", label: "Chest" },
] as const;

const parseOptionalFloat = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
};

const calculateBmiValue = (abw?: number, heightCm?: number) => {
    if (abw === undefined || heightCm === undefined || heightCm <= 0) return undefined;
    const bmi = abw / ((heightCm / 100) * (heightCm / 100));
    return Number.isFinite(bmi) ? Number(bmi.toFixed(2)) : undefined;
};

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
    const [detailsEditing, setDetailsEditing] = useState(false);

    // Redux
    const dispatch = useDispatch();
    const savedFormData = useSelector((state: RootState) =>
        state.medicalInfo.forms[selectedCadet?.ocId]
    );

    const fetchMedicalInfo = useCallback(async () => {
        if (!selectedCadet?.ocId) return;

        try {
            setLoading(true);
            const data = await getMedicalInfo(selectedCadet.ocId);

            const formatted = data.map((item) => ({
                id: item.id,
                term: semesters[item.semester - 1],
                date: ((item.date ?? item.examDate ?? "") || "").split("T")[0],
                age: String(item.age ?? ""),
                height: String(item.heightCm ?? ""),
                ibw: String(item.ibwKg ?? ""),
                abw: String(item.abwKg ?? ""),
                overw: String(item.overwtPct ?? ""),
                bmi: String(item.bmi ?? ""),
                chest: String(item.chestCm ?? ""),
                medicalHistory: item.medicalHistory ?? "",
                medicalIssues: item.hereditaryIssues ?? "",
                allergies: item.allergies ?? "",
            }));

            setSavedMedInfo(formatted);

        } catch {
            toast.error("Failed to load medical info.");
        } finally {
            setLoading(false);
        }
    }, [selectedCadet?.ocId, semesters]);

    useEffect(() => {
        fetchMedicalInfo();
    }, [fetchMedicalInfo]);

    const onSubmit = async (data: MedicalInfoForm) => {
        if (!selectedCadet?.ocId) return toast.error("No cadet selected");

        // Filter out empty rows - check if at least one field has data
        const filledRows = data.medInfo.filter(row => {
            const hasData =
                (row.date && row.date.trim() !== "") ||
                (row.age && row.age.trim() !== "") ||
                (row.height && row.height.trim() !== "") ||
                (row.ibw && row.ibw.trim() !== "") ||
                (row.abw && row.abw.trim() !== "") ||
                (row.overw && row.overw.trim() !== "") ||
                (row.bmi && row.bmi.trim() !== "") ||
                (row.chest && row.chest.trim() !== "");
            return hasData;
        });

        if (filledRows.length === 0) {
            toast.error("Please fill in at least one medical record with data");
            return;
        }

        // Validate that filled rows have required fields (date is mandatory)
        const invalidRows = filledRows.filter(row => !row.date || row.date.trim() === "");
        if (invalidRows.length > 0) {
            toast.error("Date is required for all medical records");
            return;
        }

        try {
            const payload: MedicalInfoPayload[] = [];
            for (let idx = 0; idx < filledRows.length; idx += 1) {
                const row = filledRows[idx];
                const payloadRow: MedicalInfoPayload = {
                    semester: activeTab + 1,
                    examDate: row.date,
                    medicalHistory: data.medicalHistory || "",
                    hereditaryIssues: data.medicalIssues || "",
                    allergies: data.allergies || "",
                };

                for (const field of numericFieldConfig) {
                    const raw = String(row[field.key] ?? "");
                    const parsed = parseOptionalFloat(raw);
                    if (parsed === null) {
                        toast.error(`Row ${idx + 1}: ${field.label} must be a valid number`);
                        return;
                    }
                    if (parsed !== undefined) {
                        (payloadRow as unknown as Record<string, unknown>)[field.apiKey] = parsed;
                    }
                }

                const computedBmi = calculateBmiValue(
                    payloadRow.abwKg,
                    payloadRow.heightCm
                );
                if (computedBmi !== undefined) payloadRow.bmi = computedBmi;

                payload.push(payloadRow);
            }

            const response = await saveMedicalInfo(selectedCadet.ocId, payload);

            if (!Array.isArray(response)) return toast.error("Save failed");

            toast.success(`Medical Info for ${semesters[activeTab]} saved`);

            // Clear Redux cache after successful save
            dispatch(clearMedicalInfoForm(selectedCadet.ocId));

            fetchMedicalInfo();
        } catch (err) {
            if (err instanceof ApiClientError) {
                toast.error(err.message || "Failed to save medical info.");
            } else {
                toast.error("Failed to save medical info.");
            }
        }
    };

    const handleClearForm = () => {
        if (confirm("Are you sure you want to clear all unsaved changes?")) {
            dispatch(clearMedicalInfoForm(selectedCadet.ocId));
            toast.info("Form cleared");
        }
    };

    const handleEdit = (row: MedInfoRow) => {
        setEditingId(row.id ?? null);
        setEditForm({ ...row });
    };

    const handleChange = (field: keyof MedInfoRow, value: any) => {
        setEditForm((prev) => {
            if (!prev) return prev;
            const next = { ...prev, [field]: value };

            if (field === "abw" || field === "height") {
                const abw = parseOptionalFloat(String(next.abw ?? ""));
                const height = parseOptionalFloat(String(next.height ?? ""));
                const computedBmi = calculateBmiValue(
                    typeof abw === "number" ? abw : undefined,
                    typeof height === "number" ? height : undefined
                );
                next.bmi = computedBmi !== undefined ? computedBmi.toFixed(2) : "";
            }

            return next;
        });
    };

    const handleSave = async () => {
        if (!editingId || !editForm || !selectedCadet?.ocId)
            return toast.error("Invalid operation");

        if (!editForm.date || !editForm.date.trim()) {
            toast.error("Date is required");
            return;
        }

        const payload: Record<string, unknown> = { examDate: editForm.date };
        for (const field of numericFieldConfig) {
            const raw = String(editForm[field.key] ?? "");
            const parsed = parseOptionalFloat(raw);
            if (parsed === null) {
                toast.error(`${field.label} must be a valid number`);
                return;
            }
            if (parsed !== undefined) payload[field.apiKey] = parsed;
        }

        const computedBmi = calculateBmiValue(
            payload.abwKg as number | undefined,
            payload.heightCm as number | undefined
        );
        const nextEditForm: MedInfoRow =
            computedBmi !== undefined
                ? { ...editForm, bmi: computedBmi.toFixed(2) }
                : editForm;
        if (computedBmi !== undefined) payload.bmi = computedBmi;

        try {
            await updateMedicalInfo(selectedCadet.ocId, editingId, payload);

            setSavedMedInfo((prev) =>
                prev.map((r) => (r.id === editingId ? nextEditForm : r))
            );

            toast.success("Record updated");
            setEditingId(null);
            setEditForm(null);
        } catch (err) {
            if (err instanceof ApiClientError) {
                toast.error(err.message || "Failed to update");
            } else {
                toast.error("Failed to update");
            }
        }
    };

    const getLatestDetailsForActiveTab = () => {
        const term = semesters[activeTab];
        const rows = savedMedInfo.filter((r) => r.term === term);
        if (rows.length === 0) return null;
        const toTime = (v?: string) => (v ? new Date(v).getTime() : 0);
        return rows.reduce((latest, cur) =>
            toTime(cur.date) >= toTime(latest.date) ? cur : latest
        );
    };

    const handleDetailsSave = async (details: {
        medicalHistory: string;
        medicalIssues: string;
        allergies: string;
    }) => {
        if (!selectedCadet?.ocId) return toast.error("No cadet selected");
        const activeDetails = getLatestDetailsForActiveTab();
        if (!activeDetails?.id) return toast.error("No medical record to update");

        try {
            await updateMedicalInfo(selectedCadet.ocId, activeDetails.id, {
                medicalHistory: details.medicalHistory,
                hereditaryIssues: details.medicalIssues,
                allergies: details.allergies,
            });

            setSavedMedInfo((prev) =>
                prev.map((r) =>
                    r.id === activeDetails.id
                        ? {
                            ...r,
                            medicalHistory: details.medicalHistory,
                            medicalIssues: details.medicalIssues,
                            allergies: details.allergies,
                        }
                        : r
                )
            );

            toast.success("Medical details updated");
            setDetailsEditing(false);
        } catch {
            toast.error("Failed to update medical details");
        }
    };

    const handleDetailsCancel = () => {
        setDetailsEditing(false);
    };

    const handleDelete = (row: MedInfoRow) => {
        if (!row.id || !selectedCadet?.ocId) return;

        toast.warning("Are you sure you want to delete this record?", {
            action: {
                label: "Delete",
                onClick: async () => {
                    try {
                        await deleteMedicalInfo(selectedCadet.ocId, row.id!);

                        setSavedMedInfo(prev => prev.filter(r => r.id !== row.id));
                        toast.success("Record deleted");
                    } catch {
                        toast.error("Failed to delete record");
                    }
                },
            },
            cancel: {
                label: "Cancel",
                onClick: () => { }
            },
        });
    };

    // Get default values - prioritize Redux over saved data
    const getDefaultValues = (): MedicalInfoForm => {
        const latestDetails = getLatestDetailsForActiveTab();
        if (savedFormData && savedFormData.medInfo.length > 0) {
            return {
                medInfo: savedFormData.medInfo,
                medicalHistory: savedFormData.details.medicalHistory,
                medicalIssues: savedFormData.details.medicalIssues,
                allergies: savedFormData.details.allergies,
            };
        }

        // If no Redux data but we have saved data, use those details
        if (latestDetails) {
            return {
                medInfo: [
                    { date: "", age: "", height: "", ibw: "", abw: "", overw: "", bmi: "", chest: "" }
                ],
                medicalHistory: latestDetails.medicalHistory,
                medicalIssues: latestDetails.medicalIssues,
                allergies: latestDetails.allergies,
            };
        }

        // Default empty form
        return {
            medInfo: [
                { date: "", age: "", height: "", ibw: "", abw: "", overw: "", bmi: "", chest: "" }
            ],
            medicalHistory: "",
            medicalIssues: "",
            allergies: "",
        };
    };

    const canEditDetails = Boolean(getLatestDetailsForActiveTab()?.id);

    return (
        <Card className="p-6 shadow-lg rounded-xl max-w-6xl mx-auto">
            <CardHeader>
                <CardTitle className="text-xl font-semibold text-center text-primary">
                    Medical Information Form
                </CardTitle>
            </CardHeader>

            <CardContent>
                <div className="flex justify-center mb-6 space-x-2">
                    {semesters.map((s, i) => {
                        return (
                            <button
                                key={s}
                                onClick={() => setActiveTab(i)}
                                className={`px-4 py-2 rounded-t-lg ${activeTab === i ? "bg-primary text-primary-foreground" : "bg-muted"
                                    }`}
                            >
                                {s}
                            </button>
                        )
                    })}
                </div>

                <MedicalInfoTable
                    rows={savedMedInfo}
                    semesters={semesters}
                    activeTab={activeTab}
                    loading={loading}
                    editingId={editingId}
                    editForm={editForm}
                    onEdit={handleEdit}
                    onChange={handleChange}
                    onSave={handleSave}
                    onCancel={() => { setEditingId(null); setEditForm(null); }}
                    onDelete={handleDelete}
                />

                <MedicalInfoFormComponent
                    key={`${selectedCadet?.ocId}-${savedFormData ? 'redux' : 'default'}`}
                    onSubmit={onSubmit}
                    disabled={!detailsEditing}
                    detailsEditing={detailsEditing}
                    canEditDetails={canEditDetails}
                    onDetailsEdit={() => setDetailsEditing(true)}
                    onDetailsCancel={handleDetailsCancel}
                    onDetailsSave={handleDetailsSave}
                    defaultValues={getDefaultValues()}
                    ocId={selectedCadet?.ocId || ""}
                    onClear={handleClearForm}
                />
            </CardContent>
        </Card>
    );
}
