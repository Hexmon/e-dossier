"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DossierTab from "@/components/Tabs/DossierTab";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { ChevronDown, Shield } from "lucide-react";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { catOptions, semestersCfe } from "@/constants/app.constants";
import { cfeFormData, cfeRow, defaultRow } from "@/types/cfe";

export default function CFEFormPage() {
    const [activeTab, setActiveTab] = useState<number>(0);

    const [savedData, setSavedData] = useState<cfeRow[][]>(semestersCfe.map(() => []));
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);

    const { control, handleSubmit, register, reset, setValue, watch } = useForm<cfeFormData>({
        defaultValues: {
            records: [{ ...defaultRow }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "records",
    });

    const onSubmit = (data: cfeFormData) => {
        const toSave: cfeRow[] = data.records.map((r, idx) => ({
            serialNo: String(idx + 1),
            cat: r.cat,
            mks: r.mks,
            remarks: r.remarks,
        }));

        setSavedData((prev) => {
            const next = [...prev];
            next[activeTab] = [...(next[activeTab] || []), ...toSave];
            return next;
        });

        reset({ records: [{ ...defaultRow }] });
    };

    const handleDeleteSavedRow = (index: number) => {
        setSavedData((prev) => {
            const next = [...prev];
            next[activeTab] = next[activeTab].filter((_, i) => i !== index);
            next[activeTab] = next[activeTab].map((r, i) => ({ ...r, serialNo: String(i + 1) }));
            return next;
        });
    };

    return (
        <DashboardLayout
            title="Credit For Excellence (CFE)"
            description="Manage and record cadet’s CFE scores and evaluation details."
        >
            <main className="flex-1 p-6">

                {/* Breadcrumb */}
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: "/dashboard/milmgmt" },
                        { label: "Credit For Excellence" },
                    ]}
                />

                {/* Selected Cadet */}
                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                {/* Dossier Tabs */}
                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="credit-excellence"
                    extraTabs={
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <TabsTrigger
                                    value="miltrg"
                                    className="flex items-center gap-2"
                                >
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
                    <TabsContent value="credit-excellence">
                        <Card className="max-w-6xl mx-auto p-6 rounded-2xl shadow bg-white">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-center">
                                    CREDIT FOR EXCELLENCE (CFE)
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                {/* Semester tabs */}
                                <div className="flex justify-center mb-6 space-x-2">
                                    {semestersCfe.map((s, idx) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setActiveTab(idx)}
                                            className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === idx ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>

                                <div className="overflow-x-auto border rounded-lg shadow mb-6">
                                    {savedData[activeTab].length === 0 ? (
                                        <p className="text-center p-4 text-gray-500">No submitted rows for this semester.</p>
                                    ) : (
                                        <table className="w-full border text-sm">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="p-2 border">S No</th>
                                                    <th className="p-2 border">Cat</th>
                                                    <th className="p-2 border">Mks</th>
                                                    <th className="p-2 border">Remarks</th>
                                                    <th className="p-2 border text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {savedData[activeTab].map((row, idx) => (
                                                    <tr key={idx}>
                                                        <td className="p-2 border text-center">{row.serialNo}</td>
                                                        <td className="p-2 border">{row.cat}</td>
                                                        <td className="p-2 border text-center">{row.mks}</td>
                                                        <td className="p-2 border">{row.remarks}</td>
                                                        <td className="p-2 border text-center">
                                                            <Button size="sm" variant="destructive" onClick={() => handleDeleteSavedRow(idx)}>
                                                                Delete
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                {/* Input form (dynamic rows) */}
                                <form onSubmit={handleSubmit(onSubmit)}>
                                    <div className="overflow-x-auto border rounded-lg shadow">
                                        <table className="w-full border text-sm">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="p-2 border">S No</th>
                                                    <th className="p-2 border">Cat</th>
                                                    <th className="p-2 border">Mks</th>
                                                    <th className="p-2 border">Remarks</th>
                                                    <th className="p-2 border text-center">Action</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {fields.map((field, index) => (
                                                    <tr key={field.id}>
                                                        {/* Serial auto-generated and disabled */}
                                                        <td className="p-2 border text-center">
                                                            <Input value={String(index + 1)} disabled className="text-center bg-gray-100 cursor-not-allowed" />
                                                        </td>

                                                        {/* Cat dropdown */}
                                                        {/* Cat dropdown */}
                                                        <td className="p-2 border">
                                                            <Select
                                                                onValueChange={(value) =>
                                                                    setValue(`records.${index}.cat`, value, {
                                                                        shouldDirty: true,
                                                                        shouldValidate: true,
                                                                    })
                                                                }
                                                                defaultValue={watch(`records.${index}.cat`)}
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select category..." />
                                                                </SelectTrigger>

                                                                <SelectContent className="max-h-72">
                                                                    {catOptions.map((opt, i) => (
                                                                        <SelectItem key={i} value={opt} className="whitespace-normal">
                                                                            {opt}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </td>

                                                        {/* Mks */}
                                                        <td className="p-2 border">
                                                            <Input {...register(`records.${index}.mks` as const)} type="text" />
                                                        </td>

                                                        {/* Remarks */}
                                                        <td className="p-2 border">
                                                            <Input {...register(`records.${index}.remarks` as const)} type="text" />
                                                        </td>

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

                                    {/* Row controls */}
                                    <div className="mt-4 flex justify-center gap-3">
                                        <Button type="button" onClick={() => append({ ...defaultRow })}>
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
