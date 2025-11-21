"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TermData } from "@/types/speedMarchRunback";
import { tablePrefill, termColumns, terms } from "@/constants/app.constants";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Settings, Shield } from "lucide-react";
import { toast } from "sonner";

export default function SpeedMarchPage() {
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);

    const [activeTab, setActiveTab] = useState<number>(0);
    const [savedData, setSavedData] = useState<TermData[]>(
        terms.map(() => ({ records: [] }))
    );

    const { register, handleSubmit, reset } = useForm<TermData>({
        defaultValues: { records: tablePrefill },
    });

    const onSubmit = (formData: TermData) => {
        const updated = [...savedData];
        updated[activeTab] = { records: formData.records };
        setSavedData(updated);
        toast.success(`Data saved for ${terms[activeTab]}!`);
    };

    const handleTabChange = (idx: number) => {
        setActiveTab(idx);
        const term = savedData[idx];
        if (term.records.length) reset({ records: term.records });
        else reset({ records: tablePrefill });
    };

    return (
        <DashboardLayout
            title="Assessment: Speed March / Run Back"
            description="Timing standards and marks for Speed March and Run Back."
        >
            <main className="p-6">

                {/* Breadcrumb */}
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: "/dashboard/milmgmt" },
                        { label: "Speed March-Run Back" },
                    ]}
                />

                {/* Sticky cadet table */}
                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="speed-march"
                    extraTabs={
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <TabsTrigger value="dossier-insp" className="flex items-center gap-2" >
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
                    <TabsContent value="speed-march">
                        <Card className="max-w-7xl mx-auto p-6 rounded-2xl shadow-xl bg-white">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-center text-primary">
                                    SPEED MARCH / RUN BACK
                                </CardTitle>
                            </CardHeader>

                            <CardContent>

                                {/* Tabs */}
                                <div className="flex justify-center mb-6 space-x-2">
                                    {terms.map((term, idx) => (
                                        <button
                                            key={term}
                                            onClick={() => handleTabChange(idx)}
                                            className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === idx
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-200 text-gray-700"
                                                }`}
                                        >
                                            {term}
                                        </button>
                                    ))}
                                </div>

                                {/* Saved table */}
                                {savedData[activeTab].records.length > 0 && (
                                    <div className="mb-6 overflow-x-auto border rounded-lg shadow">
                                        <table className="w-full border text-sm rounded-lg overflow-hidden">
                                            <thead className="bg-gray-200">
                                                <tr>
                                                    <th className="p-2 border">Test</th>
                                                    <th className="p-2 border">Timings</th>
                                                    <th className="p-2 border">
                                                        {activeTab === 0 ? "10 KM" : activeTab === 1 ? "20 KM" : "30 KM"}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {savedData[activeTab].records.map((r, i) => (
                                                    <tr key={i}>
                                                        <td className="p-2 border">{r.test}</td>
                                                        <td className="p-2 border text-center">{r[termColumns[activeTab].timing]}</td>
                                                        <td className="p-2 border text-center">{r[termColumns[activeTab].distance]}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Editable Form */}
                                <form onSubmit={handleSubmit(onSubmit)}>
                                    <div className="overflow-x-auto border rounded-lg shadow">
                                        <table className="w-full border text-sm">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="p-2 border">Test</th>
                                                    <th className="p-2 border">Timings</th>
                                                    <th className="p-2 border">
                                                        {activeTab === 0 ? "10 KM" : activeTab === 1 ? "20 KM" : "30 KM"}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tablePrefill.map((row, i) => (
                                                    <tr key={i}>
                                                        <td className="p-2 border">{row.test}</td>

                                                        <td className="p-2 border">
                                                            <Input
                                                                {...register(`records.${i}.${termColumns[activeTab].timing}`)}
                                                                defaultValue={row[termColumns[activeTab].timing]}
                                                            />
                                                        </td>

                                                        <td className="p-2 border">
                                                            <Input
                                                                {...register(`records.${i}.${termColumns[activeTab].distance}`)}
                                                                defaultValue={row[termColumns[activeTab].distance]}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex justify-center gap-3 mt-6">
                                        <Button type="submit" className="bg-green-600 hover:bg-green-700">
                                            Save
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => reset({ records: tablePrefill })}
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
        </DashboardLayout >
    );
}
