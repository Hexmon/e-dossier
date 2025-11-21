"use client";

import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormValues } from "@/types/club-detls";
import { defaultClubRows, defaultDrillRows } from "@/constants/app.constants";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { ChevronDown, Shield } from "lucide-react";
import DossierTab from "@/components/Tabs/DossierTab";

export default function ClubDetailsAndDrillPage() {
    const selectedCadet = useSelector((s: RootState) => s.cadet.selectedCadet);
    const [savedData, setSavedData] = useState<FormValues | null>(null);


    const { register, control, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
        defaultValues: {
            clubRows: defaultClubRows,
            drillRows: defaultDrillRows,
            splAchievementsList: ["", "", "", ""],
        },
    });

    const { fields: clubFields } = useFieldArray({ control, name: "clubRows" });
    const { fields: drillFields } = useFieldArray({ control, name: "drillRows" });

    const watchedDrill = watch("drillRows");
    useEffect(() => {
        if (!watchedDrill) return;
        const totals = watchedDrill.slice(0, 3).reduce(
            (acc, r) => {
                acc.m1 += Number(r.m1 || 0);
                acc.m2 += Number(r.m2 || 0);
                acc.a1c1 += Number(r.a1c1 || 0);
                acc.a2c2 += Number(r.a2c2 || 0);
                return acc;
            },
            { m1: 0, m2: 0, a1c1: 0, a2c2: 0 }
        );
        setValue("drillRows.3.m1", totals.m1 || "");
        setValue("drillRows.3.m2", totals.m2 || "");
        setValue("drillRows.3.a1c1", totals.a1c1 || "");
        setValue("drillRows.3.a2c2", totals.a2c2 || "");
    }, [watchedDrill, setValue]);

    const onSubmit = (data: FormValues) => {
        setSavedData(data);
    };

    const onReset = () => {
        reset();
        setSavedData(null);
    };

    return (
        <DashboardLayout
            title="Assessment: Club Details & Drill"
            description="Maintain cadet’s club involvement and drill performance records."
        >
            <main className="flex-1 p-6">
                {/* Breadcrumb */}
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: "/dashboard/milmgmt" },
                        { label: "Club Details" },
                    ]}
                />

                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}
                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="club-detls"
                    extraTabs={
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <TabsTrigger value="miltrg" className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" /> Mil-Trg
                                    <ChevronDown className="h-4 w-4" />
                                </TabsTrigger>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                                {militaryTrainingCards.map(card => (
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

                    <TabsContent value="club-detls" className="space-y-6">

                        {/* CARD */}
                        <Card className="max-w-5xl mx-auto p-6 shadow-lg rounded-2xl bg-white">
                            <CardHeader>
                                <CardTitle className="text-center text-primary font-bold">
                                    CLUB DETAILS & DRILL ASSESSMENT
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                {!savedData ? (
                                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                        {/* Club Table */}
                                        <div className="overflow-x-auto border rounded-lg shadow-sm">
                                            <table className="w-full border-collapse text-sm">
                                                <thead className="bg-blue-50 text-gray-700">
                                                    <tr>
                                                        <th className="border p-2">Semester</th>
                                                        <th className="border p-2">Name of Club</th>
                                                        <th className="border p-2">Spl Achievement</th>
                                                        <th className="border p-2">Remarks by Club OIC</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {clubFields.map((f, idx) => (
                                                        <tr key={f.id}>
                                                            <td className="border p-2">
                                                                <Input {...register(`clubRows.${idx}.semester`)} />
                                                            </td>
                                                            <td className="border p-2">
                                                                <Input {...register(`clubRows.${idx}.clubName`)} />
                                                            </td>
                                                            <td className="border p-2">
                                                                <Input {...register(`clubRows.${idx}.splAchievement`)} />
                                                            </td>
                                                            <td className="border p-2">
                                                                <Input {...register(`clubRows.${idx}.remarks`)} />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Drill Table */}
                                        <div className="text-center font-semibold underline text-primary text-lg mt-6">
                                            ASSESSMENT : DRILL
                                        </div>
                                        <div className="overflow-x-auto border rounded-lg shadow-sm">
                                            <table className="w-full border-collapse text-sm">
                                                <thead className="bg-blue-50 text-gray-700">
                                                    <tr>
                                                        <th className="border p-2">Semester</th>
                                                        <th className="border p-2">Max Mks</th>
                                                        <th className="border p-2">M1</th>
                                                        <th className="border p-2">M2</th>
                                                        <th className="border p-2">A1/C1</th>
                                                        <th className="border p-2">A2/C2</th>
                                                        <th className="border p-2">Remarks</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {drillFields.map((f, idx) => (
                                                        <tr key={f.id}>
                                                            <td className="border p-2">
                                                                <Input {...register(`drillRows.${idx}.semester`)} />
                                                            </td>
                                                            <td className="border p-2">
                                                                <Input type="number" {...register(`drillRows.${idx}.maxMks`)} />
                                                            </td>
                                                            <td className="border p-2">
                                                                <Input type="number" {...register(`drillRows.${idx}.m1`)} />
                                                            </td>
                                                            <td className="border p-2">
                                                                <Input type="number" {...register(`drillRows.${idx}.m2`)} />
                                                            </td>
                                                            <td className="border p-2">
                                                                <Input type="number" {...register(`drillRows.${idx}.a1c1`)} />
                                                            </td>
                                                            <td className="border p-2">
                                                                <Input type="number" {...register(`drillRows.${idx}.a2c2`)} />
                                                            </td>
                                                            <td className="border p-2">
                                                                <Input {...register(`drillRows.${idx}.remarks`)} />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Special Achievements */}
                                        <p className="mt-4 font-bold text-gray-700">
                                            <u>Spl Achievement</u> (Cane Orderly, Samman Toli, Nishan Toli, Best in Drill)
                                        </p>
                                        <div className="mt-3 space-y-3">
                                            {Array.from({ length: 4 }).map((_, i) => (
                                                <div key={i} className="flex items-center space-x-3">
                                                    <div className="w-6 text-sm">{i + 1}.</div>
                                                    <Input {...register(`splAchievementsList.${i}`)} />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex justify-center gap-4 mt-6">
                                            <Button type="submit" className="bg-blue-600 text-white">
                                                Save
                                            </Button>
                                            <Button type="button" variant="outline" onClick={onReset}>
                                                Reset
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="space-y-8">
                                        <h2 className="text-lg font-bold text-center text-primary">Saved Records</h2>

                                        {/* View Club Table */}
                                        <div className="overflow-x-auto border rounded-lg shadow-sm">
                                            <table className="w-full border text-sm">
                                                <thead className="bg-blue-50">
                                                    <tr>
                                                        <th className="border p-2">Semester</th>
                                                        <th className="border p-2">Club</th>
                                                        <th className="border p-2">Spl Achievement</th>
                                                        <th className="border p-2">Remarks</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {savedData.clubRows.map((row, i) => (
                                                        <tr key={i}>
                                                            <td className="border p-2">{row.semester}</td>
                                                            <td className="border p-2">{row.clubName}</td>
                                                            <td className="border p-2">{row.splAchievement}</td>
                                                            <td className="border p-2">{row.remarks}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* View Drill Table */}
                                        <div className="overflow-x-auto border rounded-lg shadow-sm">
                                            <table className="w-full border text-sm">
                                                <thead className="bg-blue-50">
                                                    <tr>
                                                        <th className="border p-2">Semester</th>
                                                        <th className="border p-2">Max Mks</th>
                                                        <th className="border p-2">M1</th>
                                                        <th className="border p-2">M2</th>
                                                        <th className="border p-2">A1/C1</th>
                                                        <th className="border p-2">A2/C2</th>
                                                        <th className="border p-2">Remarks</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {savedData.drillRows.map((row, i) => (
                                                        <tr key={i}>
                                                            <td className="border p-2">{row.semester}</td>
                                                            <td className="border p-2">{row.maxMks}</td>
                                                            <td className="border p-2">{row.m1}</td>
                                                            <td className="border p-2">{row.m2}</td>
                                                            <td className="border p-2">{row.a1c1}</td>
                                                            <td className="border p-2">{row.a2c2}</td>
                                                            <td className="border p-2">{row.remarks}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Spl Achievement List */}
                                        <div>
                                            <h3 className="font-semibold underline text-primary mb-2">Special Achievements</h3>
                                            <ul className="list-disc pl-6 space-y-1">
                                                {savedData.splAchievementsList
                                                    .filter((s) => s)
                                                    .map((s, i) => (
                                                        <li key={i}>{s}</li>
                                                    ))}
                                            </ul>
                                        </div>

                                        <div className="flex justify-center mt-4">
                                            <Button onClick={() => setSavedData(null)} className="bg-blue-600 text-white">
                                                Edit Again
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}