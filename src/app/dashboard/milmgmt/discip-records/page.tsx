"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Shield, ChevronDown } from "lucide-react";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import DossierTab from "@/components/Tabs/DossierTab";

import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
    deleteDisciplineRecord,
    getDisciplineRecords,
    saveDisciplineRecords,
    updateDisciplineRecord,
} from "@/app/lib/api/disciplineApi";

import { DisciplineForm, DisciplineRow } from "@/types/dicp-records";
import { toast } from "sonner";
import { semesters } from "@/constants/app.constants";

export default function DisciplineRecordsPage() {
    const router = useRouter();
    const selectedCadet = useSelector(
        (state: RootState) => state.cadet.selectedCadet
    );

    const [activeTab, setActiveTab] = useState(0);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<DisciplineRow | null>(null);

    const defaultRow = {
        serialNo: "",
        dateOfOffence: "",
        offence: "",
        punishmentAwarded: "",
        dateOfAward: "",
        byWhomAwarded: "",
        negativePts: "",
        cumulative: "",
    };

    const { control, handleSubmit, register, reset, setValue } = useForm<DisciplineForm>({
        defaultValues: {
            records: [{ ...defaultRow }],
        },
    });

    const watchedRecords = useWatch({ control, name: "records" });

    useEffect(() => {
        if (!watchedRecords) return;

        let total = 0;

        watchedRecords.forEach((row, index) => {
            const neg = Number(row.negativePts || 0);
            total += neg;
            setValue(`records.${index}.cumulative`, total.toString());
        });

    }, [JSON.stringify(watchedRecords)]);

    const { fields, append, remove } = useFieldArray({
        control,
        name: "records",
    });

    const [savedData, setSavedData] = useState<DisciplineRow[][]>(
        semesters.map(() => [])
    );

    const handleEdit = (row: DisciplineRow) => {
        if (!row.id) return toast.error("Record missing ID");
        setEditingId(row.id);
        setEditForm({ ...row });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm(null);
    };

    const handleSave = async () => {
        if (!selectedCadet?.ocId || !editingId || !editForm) return;

        const payload = {
            punishmentAwarded: editForm.punishmentAwarded,
            pointsDelta: Number(editForm.negativePts),
        };

        try {
            await updateDisciplineRecord(selectedCadet.ocId, editingId, payload);

            setSavedData((prev) => {
                const updated = [...prev];
                updated[activeTab] = updated[activeTab].map((r) =>
                    r.id === editingId ? { ...editForm } : r
                );
                return updated;
            });

            toast.success("Record updated successfully!");
            handleCancel();
        } catch {
            toast.error("Failed to update record");
        }
    };

    const handleDelete = async (row: DisciplineRow) => {
        if (!selectedCadet?.ocId || !row.id) return;

        toast.warning("Are you sure?", {
            action: {
                label: "Delete",
                onClick: async () => {
                    await deleteDisciplineRecord(selectedCadet.ocId, row.id);
                    setSavedData((prev) => {
                        const updated = [...prev];
                        updated[activeTab] = updated[activeTab].filter(
                            (r) => r.id !== row.id
                        );
                        return updated;
                    });
                    toast.success("Record deleted");
                },
            },
        });
    };

    const onSubmit = async (data: DisciplineForm) => {
        if (!selectedCadet?.ocId) {
            toast.error("Select a cadet first");
            return;
        }

        const payloads = data.records.map((row) => ({
            semester: activeTab + 1,
            dateOfOffence: row.dateOfOffence,
            offence: row.offence,
            punishmentAwarded: row.punishmentAwarded || null,
            awardedOn: row.dateOfAward || null,
            awardedBy: row.byWhomAwarded || null,
            pointsDelta: row.negativePts ? Number(row.negativePts) : 0,
            pointsCumulative: row.cumulative ? Number(row.cumulative) : 0,
        }));

        const resp = await saveDisciplineRecords(selectedCadet.ocId, payloads);
        if (!resp.ok) return toast.error("Failed to save");

        await fetchRecords();
        reset({ records: [{ ...defaultRow }] });
        toast.success("Saved successfully!");
    };

    const fetchRecords = async () => {
        if (!selectedCadet?.ocId) return;

        const records = await getDisciplineRecords(selectedCadet.ocId);
        const grouped = semesters.map(() => [] as DisciplineRow[]);

        for (const rec of records) {
            const semIndex = rec.semester - 1;
            grouped[semIndex].push({
                id: rec.id,
                serialNo: String(grouped[semIndex].length + 1),
                dateOfOffence: rec.dateOfOffence?.split("T")[0] ?? "-",
                offence: rec.offence ?? "-",
                punishmentAwarded: rec.punishmentAwarded ?? "-",
                dateOfAward: rec.awardedOn?.split("T")[0] ?? "-",
                byWhomAwarded: rec.awardedBy ?? "-",
                negativePts: String(rec.pointsDelta ?? ""),
                cumulative: String(rec.pointsCumulative ?? ""),
            });
        }

        setSavedData(grouped);
    };

    useEffect(() => {
        fetchRecords();
    }, [selectedCadet]);

    return (
        <DashboardLayout
            title="Discipline Records"
            description="Log disciplinary actions and observations."
        >
            <main className="p-6">

                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: "/dashboard/milmgmt" },
                        { label: "Discipline Records" },
                    ]}
                />

                {selectedCadet && (
                    <SelectedCadetTable selectedCadet={selectedCadet} />
                )}

                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="discip-records"
                    extraTabs={
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <TabsTrigger value="dossier-insp">
                                    <Shield className="h-4 w-4" />
                                    Mil-Trg
                                    <ChevronDown className="h-4 w-4 ml-1" />
                                </TabsTrigger>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent>
                                {militaryTrainingCards.map((card) => (
                                    <DropdownMenuItem key={card.to} asChild>
                                        <a href={card.to} className="flex items-center gap-2">
                                            <card.icon className={`h-4 w-4 ${card.color}`} />
                                            {card.title}
                                        </a>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    }
                >
                    <TabsContent value="discip-records" className="space-y-6">
                        <Card className="max-w-6xl mx-auto p-6 rounded-2xl shadow-xl bg-white">
                            <CardHeader>
                                <CardTitle className="text-xl font-semibold text-center text-primary">
                                    DISCIPLINE RECORDS
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                {/* Semester Tabs */}
                                <div className="flex justify-center mb-6 space-x-2">
                                    {semesters.map((sem, index) => (
                                        <button
                                            key={sem}
                                            type="button"
                                            onClick={() => setActiveTab(index)}
                                            className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === index
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-200 text-gray-700"
                                                }`}
                                        >
                                            {sem}
                                        </button>
                                    ))}
                                </div>

                                {/* Saved Data */}
                                <div className="overflow-x-auto border rounded-lg shadow mb-6">
                                    {savedData[activeTab].length === 0 ? (
                                        <p className="text-center p-4 text-gray-500">
                                            No data submitted yet for this semester.
                                        </p>
                                    ) : (
                                        <table className="w-full border text-sm">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    {Object.keys(defaultRow).map((key) => (
                                                        <th key={key} className="p-2 border capitalize">
                                                            {key.replace(/([A-Z])/g, " $1")}
                                                        </th>
                                                    ))}
                                                    <th className="p-2 border text-center">Action</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {savedData[activeTab].map((row, index) => {
                                                    const isEditing = editingId === row.id;

                                                    return (
                                                        <tr key={row.id || index}>
                                                            {/* Serial No */}
                                                            <td className="p-2 border">{row.serialNo}</td>

                                                            {/* Date of Offence */}
                                                            <td className="p-2 border">
                                                                {isEditing ? (
                                                                    <Input
                                                                        type="date"
                                                                        value={editForm?.dateOfOffence || ""}
                                                                        onChange={(e) =>
                                                                            setEditForm((prev) =>
                                                                                prev ? { ...prev, dateOfOffence: e.target.value } : prev
                                                                            )
                                                                        }
                                                                    />
                                                                ) : row.dateOfOffence}
                                                            </td>

                                                            {/* Offence */}
                                                            <td className="p-2 border">
                                                                {isEditing ? (
                                                                    <Input
                                                                        value={editForm?.offence || ""}
                                                                        onChange={(e) =>
                                                                            setEditForm((prev) =>
                                                                                prev ? { ...prev, offence: e.target.value } : prev
                                                                            )
                                                                        }
                                                                    />
                                                                ) : row.offence}
                                                            </td>

                                                            {/* Punishment */}
                                                            <td className="p-2 border">
                                                                {isEditing ? (
                                                                    <Input
                                                                        value={editForm?.punishmentAwarded || ""}
                                                                        onChange={(e) =>
                                                                            setEditForm((prev) =>
                                                                                prev ? { ...prev, punishmentAwarded: e.target.value } : prev
                                                                            )
                                                                        }
                                                                    />
                                                                ) : row.punishmentAwarded}
                                                            </td>

                                                            {/* Date of Award */}
                                                            <td className="p-2 border">
                                                                {isEditing ? (
                                                                    <Input
                                                                        type="date"
                                                                        value={editForm?.dateOfAward || ""}
                                                                        onChange={(e) =>
                                                                            setEditForm((prev) =>
                                                                                prev ? { ...prev, dateOfAward: e.target.value } : prev
                                                                            )
                                                                        }
                                                                    />
                                                                ) : row.dateOfAward}
                                                            </td>

                                                            {/* By Whom Awarded */}
                                                            <td className="p-2 border">
                                                                {isEditing ? (
                                                                    <Input
                                                                        value={editForm?.byWhomAwarded || ""}
                                                                        onChange={(e) =>
                                                                            setEditForm((prev) =>
                                                                                prev ? { ...prev, byWhomAwarded: e.target.value } : prev
                                                                            )
                                                                        }
                                                                    />
                                                                ) : row.byWhomAwarded}
                                                            </td>

                                                            {/* Negative Points */}
                                                            <td className="p-2 border">
                                                                {isEditing ? (
                                                                    <Input
                                                                        type="number"
                                                                        value={editForm?.negativePts || ""}
                                                                        onChange={(e) =>
                                                                            setEditForm((prev) =>
                                                                                prev ? { ...prev, negativePts: e.target.value } : prev
                                                                            )
                                                                        }
                                                                    />
                                                                ) : row.negativePts}
                                                            </td>

                                                            {/* Cumulative */}
                                                            <td className="p-2 border">{row.cumulative}</td>

                                                            {/* ACTION BUTTONS */}
                                                            <td className="p-2 border text-center">
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
                                    )}
                                </div>

                                {/* Input Form */}
                                <form onSubmit={handleSubmit(onSubmit)}>
                                    <div className="overflow-x-auto border rounded-lg shadow">
                                        <table className="w-full border text-sm">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    {Object.keys(defaultRow).map((key) => (
                                                        <th key={key} className="p-2 border capitalize">
                                                            {key.replace(/([A-Z])/g, " $1")}
                                                        </th>
                                                    ))}
                                                    <th className="p-2 border text-center">Action</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {fields.map((field, index) => (
                                                    <tr key={field.id}>
                                                        {/* Serial No */}
                                                        <td className="p-2 border text-center">
                                                            <Input
                                                                value={index + 1}
                                                                disabled
                                                                className="text-center bg-gray-100 cursor-not-allowed"
                                                            />
                                                        </td>

                                                        {Object.keys(defaultRow)
                                                            .filter((key) => key !== "serialNo")
                                                            .map((key) => (
                                                                <td key={key} className="p-2 border">

                                                                    {key === "cumulative" ? (
                                                                        <Input
                                                                            {...register(`records.${index}.cumulative` as const)}
                                                                            disabled
                                                                            className="bg-gray-100 text-center cursor-not-allowed"
                                                                        />
                                                                    ) : (
                                                                        <Input
                                                                            {...register(`records.${index}.${key}` as const)}
                                                                            type={key.includes("date") ? "date" : "text"}
                                                                        />
                                                                    )}

                                                                </td>
                                                            ))}

                                                        {/* Remove button */}
                                                        <td className="p-2 border text-center">
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

                                    {/* Actions */}
                                    <div className="mt-4 flex justify-center gap-3">
                                        <Button
                                            type="button"
                                            onClick={() => append({ ...defaultRow })}
                                        >
                                            + Add Row
                                        </Button>
                                        <Button type="submit" className="bg-green-600 hover:bg-green-700">
                                            Submit
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => reset({ records: [{ ...defaultRow }] })}
                                        >
                                            Reset
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </DossierTab>

            </main>
        </DashboardLayout>
    );
}
