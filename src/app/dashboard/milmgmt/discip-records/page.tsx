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
    const [savedData, setSavedData] = useState<DisciplineRow[][]>(semesters.map(() => []));
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<DisciplineRow | null>(null);
    const [displayCumulative, setDisplayCumulative] = useState<string[]>([]);


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

    const { control, handleSubmit, register, watch, reset, setValue } = useForm<DisciplineForm>({
        defaultValues: {
            records: [{ ...defaultRow }],
        },
    });

    // keep stable reference to fields
    const { fields, append, remove } = useFieldArray({ control, name: "records" });

    // watch records for cumulative calculation
    const watchedRecords = useWatch({ control, name: "records" }) || [];

    // compute cumulative totals based on savedData base for active tab
    useEffect(() => {
        if (!watchedRecords) return;

        let baseCumulative = 0;
        const prevRows = savedData[activeTab];

        if (prevRows?.length > 0) {
            const last = prevRows[prevRows.length - 1];
            baseCumulative = Number(last.cumulative) || 0;
        }

        let total = baseCumulative;

        const newDisplay = [] as string[];

        watchedRecords.forEach((row, index) => {
            const neg = Number(row.negativePts || 0);
            total += neg;

            // Update RHF internal cumulative (no flicker since displayed value is separate)
            setValue(`records.${index}.cumulative`, total.toString(), { shouldDirty: false });

            // Store stable displayed cumulative (empty for >=0)
            newDisplay[index] = total < 0 ? String(total) : "";
        });

        setDisplayCumulative(newDisplay);
    }, [JSON.stringify(watchedRecords), activeTab, savedData]);


    // hide cumulative in UI when non-negative (keep form value present but show empty in input)
    useEffect(() => {
        const subscription = watch((values, { name }) => {
            // avoid reacting to direct cumulative changes to prevent loops
            if (name?.includes("cumulative")) return;

            values.records?.forEach((record, idx) => {
                const cumRaw = record?.cumulative;
                const cumNum = Number(cumRaw ?? 0);

                // If cumulative is non-negative, set to string but UI will decide showing
                // we keep the value in form for correctness but will render empty if >=0
                setValue(`records.${idx}.cumulative`, String(cumNum));
            });
        });

        return () => subscription.unsubscribe();
    }, [watch, setValue]);

    const handleEdit = (row: DisciplineRow) => {
        if (!row.id) {
            toast.error("Record missing ID");
            return;
        }
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
            punishment: editForm.punishmentAwarded,
            points: Number(editForm.negativePts),
        };

        try {
            await updateDisciplineRecord(selectedCadet.ocId, editingId, payload);
            await fetchRecords();
            toast.success("Record updated successfully!");
            handleCancel();
        } catch {
            toast.error("Failed to update record");
        }
    };

    const handleDelete = async (row: DisciplineRow) => {
        const { ocId } = selectedCadet || {};
        const recordId = row?.id;

        if (!ocId || !recordId) {
            toast.error("Cadet or record ID is missing.");
            return;
        }

        toast.warning("Are you sure?", {
            action: {
                label: "Delete",
                onClick: async () => {
                    await deleteDisciplineRecord(ocId, recordId);
                    await fetchRecords();
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
            const semIndex = Math.max(0, (rec.semester || 1) - 1);
            const prevRows = grouped[semIndex];
            const prevCumulative = prevRows.length ? Number(prevRows[prevRows.length - 1].cumulative) || 0 : 0;
            const pointsDelta = Number(rec.pointsDelta ?? 0);
            const newCumulative = prevCumulative + pointsDelta;

            grouped[semIndex].push({
                id: rec.id,
                serialNo: String(prevRows.length + 1),
                dateOfOffence: rec.dateOfOffence?.split("T")[0] ?? "-",
                offence: rec.offence ?? "-",
                punishmentAwarded: rec.punishmentAwarded ?? "-",
                dateOfAward: rec.awardedOn?.split("T")[0] ?? "-",
                byWhomAwarded: rec.awardedBy ?? "-",
                negativePts: String(rec.pointsDelta ?? "0"),
                cumulative: String(newCumulative),
            });
        }

        setSavedData(grouped);
    };

    useEffect(() => {
        fetchRecords();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCadet?.ocId]);

    // ----------------------------- RENDER --------------------------------
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
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
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
                                                    const cumulativeValue = watch(`records.${index}.cumulative`);

                                                    return (
                                                        <tr key={row.id || index}>
                                                            {/* Serial No */}
                                                            <td className="p-2 border">{row.serialNo}</td>

                                                            {/* Date of Offence */}
                                                            <td className="p-2 border">
                                                                {isEditing ? (
                                                                    <Input
                                                                        type="date"
                                                                        value={Number(cumulativeValue) < 0 ? cumulativeValue : ""}
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
                                                {fields.map((field, index) => {
                                                    const cumulativeValue = watch(`records.${index}.cumulative`);

                                                    return (
                                                        <tr key={field.id}>
                                                            {/* Serial No */}
                                                            <td className="p-2 border text-center">
                                                                <Input disabled className="bg-gray-100 text-center cursor-not-allowed" value={displayCumulative[index] ?? ""}
                                                                />

                                                            </td>

                                                            {Object.keys(defaultRow)
                                                                .filter((key) => key !== "serialNo")
                                                                .map((key) => (
                                                                    <td key={key} className="p-2 border">
                                                                        {key === "cumulative" ? (
                                                                            <Input
                                                                                {...register(`records.${index}.cumulative`)}
                                                                                disabled
                                                                                value={
                                                                                    cumulativeValue !== undefined && Number(cumulativeValue) < 0
                                                                                        ? String(cumulativeValue)
                                                                                        : ""
                                                                                }
                                                                                className="bg-gray-100 text-center cursor-not-allowed"
                                                                            />
                                                                        ) : (
                                                                            <Input
                                                                                {...register(
                                                                                    `records.${index}.${key as keyof typeof defaultRow}`
                                                                                )}
                                                                                type={key.includes("date") ? "date" : "text"}
                                                                            />
                                                                        )}
                                                                    </td>
                                                                ))}

                                                            {/* Remove button (RIGHT ALIGNED, NO SHIFTING) */}
                                                            <td className="p-2 border text-center whitespace-nowrap">
                                                                <Button
                                                                    type="button"
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    onClick={() => remove(index)}
                                                                    className="w-full"
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
