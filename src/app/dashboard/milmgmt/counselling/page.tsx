"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { Shield, ChevronDown } from "lucide-react";

import {
    counsellingDefaultRow,
    CounsellingFormData,
    CounsellingRow,
} from "@/types/counselling";

import { semestersCounselling, warningTypes } from "@/constants/app.constants";

import {
    deleteCounsellingRecord,
    getCounsellingRecords,
    saveCounsellingRecords,
} from "@/app/lib/api/counsellingApi";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";

export default function CounsellingWarningPage() {
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);

    const [activeTab, setActiveTab] = useState<number>(0);

    // Six-term saved array
    const [savedData, setSavedData] = useState<CounsellingRow[][]>(
        semestersCounselling.map(() => [])
    );

    const { control, handleSubmit, register, setValue, reset, watch } =
        useForm<CounsellingFormData>({
            defaultValues: {
                records: [{ ...counsellingDefaultRow }],
            },
        });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "records",
    });

    // Load saved data for cadet
    const fetchRecords = async () => {
        if (!selectedCadet?.ocId) return;

        try {
            const data = await getCounsellingRecords(selectedCadet.ocId);

            // group by term index
            const grouped = semestersCounselling.map(() => [] as CounsellingRow[]);

            data.forEach((r: CounsellingRow) => {
                const idx = semestersCounselling.indexOf(r.term);
                if (idx >= 0) grouped[idx].push(r);
            });

            // fix serial numbers
            grouped.forEach((g) =>
                g.forEach((row, i) => (row.serialNo = String(i + 1)))
            );

            setSavedData(grouped);
        } catch (err) {
            console.error("Fetch failed", err);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, [selectedCadet]);

    // Submit new rows to selected term
    const onSubmit = async (data: CounsellingFormData) => {
        if (!selectedCadet?.ocId) {
            alert("Please select a cadet first");
            return;
        }

        const payload = data.records.map((r, idx) => ({
            term: semestersCounselling[activeTab],
            reason: r.reason,
            warningType: r.warningType,
            date: r.date,
            warningBy: r.warningBy,
        }));

        try {
            const saved = await saveCounsellingRecords(selectedCadet.ocId, payload);

            const newRows: CounsellingRow[] = saved.map((r: any, i: number) => ({
                id: r.id,
                serialNo: "",
                term: r.term,
                reason: r.reason,
                warningType: r.warningType,
                date: r.date,
                warningBy: r.warningBy,
            }));

            setSavedData((prev) => {
                const next = [...prev];
                next[activeTab] = [...next[activeTab], ...newRows];
                next[activeTab] = next[activeTab].map((r, i) => ({
                    ...r,
                    serialNo: String(i + 1),
                }));
                return next;
            });

            reset({ records: [{ ...counsellingDefaultRow }] });
        } catch (err) {
            console.error("Save error", err);
        }
    };

    const handleDelete = async (row: CounsellingRow, index: number) => {
        try {
            if (row.id) await deleteCounsellingRecord(row.id);

            setSavedData((prev) => {
                const next = [...prev];
                next[activeTab] = next[activeTab].filter((_, i) => i !== index);
                next[activeTab] = next[activeTab].map((r, i) => ({
                    ...r,
                    serialNo: String(i + 1),
                }));
                return next;
            });
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    return (
        <DashboardLayout
            title="Counselling - Warning Record"
            description="Record counselling & warnings across terms."
        >
            <main className="p-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: "/dashboard/milmgmt" },
                        { label: "Counselling / Warning Record" },
                    ]}
                />

                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="counselling"
                    extraTabs={
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <TabsTrigger value="mil-trg" className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    Mil-Trg
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </TabsTrigger>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {militaryTrainingCards.map((card) => (
                                    <DropdownMenuItem key={card.to} asChild>
                                        <a href={card.to} className="flex items-center gap-2">
                                            <card.icon className={`h-4 w-4 ${card.color}`} />
                                            <span>{card.title}</span>
                                        </a>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    }
                >
                    <TabsContent value="counselling">
                        <section className="p-6">
                            <Card className="max-w-6xl mx-auto p-6 shadow bg-white">
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold text-center">
                                        COUNSELLING / WARNING RECORD : ALL TERMS
                                    </CardTitle>
                                </CardHeader>

                                <CardContent>
                                    {/* Tabs for terms */}
                                    <div className="flex justify-center mb-6 space-x-2">
                                        {semestersCounselling.map((term, idx) => (
                                            <button
                                                key={term}
                                                onClick={() => setActiveTab(idx)}
                                                className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === idx
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-gray-200 text-gray-700"
                                                    }`}
                                            >
                                                {term}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Saved Records Table */}
                                    <div className="overflow-x-auto border rounded-lg shadow mb-6">
                                        {savedData[activeTab].length === 0 ? (
                                            <p className="text-center p-4 text-gray-500">
                                                No saved records for this term.
                                            </p>
                                        ) : (
                                            <table className="w-full border text-sm">
                                                <thead className="bg-gray-100">
                                                    <tr>
                                                        <th className="p-2 border text-center">S No</th>
                                                        <th className="p-2 border">Reason (Attach copy)</th>
                                                        <th className="p-2 border">
                                                            Nature of Warning <br /> (Relegation / Withdrawal)
                                                        </th>
                                                        <th className="p-2 border">Date</th>
                                                        <th className="p-2 border">Warning by (Rk & Name)</th>
                                                        <th className="p-2 border text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {savedData[activeTab].map((row, i) => (
                                                        <tr key={row.id ?? i}>
                                                            <td className="p-2 border text-center">
                                                                {row.serialNo}
                                                            </td>
                                                            <td className="p-2 border">{row.reason}</td>
                                                            <td className="p-2 border">{row.warningType}</td>
                                                            <td className="p-2 border">{row.date}</td>
                                                            <td className="p-2 border">{row.warningBy}</td>
                                                            <td className="p-2 border text-center">
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() =>
                                                                        handleDelete(row, i)
                                                                    }
                                                                >
                                                                    Delete
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
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
                                                        <th className="p-2 border text-center">S No</th>
                                                        <th className="p-2 border">Reason (Attach copy)</th>
                                                        <th className="p-2 border">
                                                            Nature of Warning <br /> (Relegation / Withdrawal)
                                                        </th>
                                                        <th className="p-2 border">Date</th>
                                                        <th className="p-2 border">
                                                            Warning by (Rk & Name)
                                                        </th>
                                                        <th className="p-2 border text-center">Action</th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {fields.map((field, idx) => (
                                                        <tr key={field.id}>
                                                            <td className="p-2 border text-center">
                                                                <Input
                                                                    value={String(idx + 1)}
                                                                    disabled
                                                                    className="bg-gray-100 text-center"
                                                                />
                                                            </td>

                                                            <td className="p-2 border">
                                                                <Input
                                                                    {...register(
                                                                        `records.${idx}.reason`
                                                                    )}
                                                                />
                                                            </td>

                                                            <td className="p-2 border">
                                                                <Select
                                                                    value={watch(
                                                                        `records.${idx}.warningType`
                                                                    )}
                                                                    onValueChange={(v) =>
                                                                        setValue(
                                                                            `records.${idx}.warningType`,
                                                                            v
                                                                        )
                                                                    }
                                                                >
                                                                    <SelectTrigger className="w-full">
                                                                        <SelectValue placeholder="Select" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {warningTypes.map((t) => (
                                                                            <SelectItem
                                                                                value={t}
                                                                                key={t}
                                                                            >
                                                                                {t}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </td>

                                                            <td className="p-2 border">
                                                                <Input
                                                                    type="date"
                                                                    {...register(
                                                                        `records.${idx}.date`
                                                                    )}
                                                                />
                                                            </td>

                                                            <td className="p-2 border">
                                                                <Input
                                                                    {...register(
                                                                        `records.${idx}.warningBy`
                                                                    )}
                                                                />
                                                            </td>

                                                            <td className="p-2 border text-center">
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() =>
                                                                        remove(idx)
                                                                    }
                                                                >
                                                                    Remove
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="mt-4 flex justify-center gap-4">
                                            <Button
                                                type="button"
                                                onClick={() =>
                                                    append({ ...counsellingDefaultRow })
                                                }
                                            >
                                                + Add Row
                                            </Button>

                                            <Button
                                                type="submit"
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                Submit
                                            </Button>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    reset({
                                                        records: [{ ...counsellingDefaultRow }],
                                                    })
                                                }
                                            >
                                                Reset
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        </section>
                    </TabsContent>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}
