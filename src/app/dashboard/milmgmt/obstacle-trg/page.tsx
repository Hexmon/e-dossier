"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TermData } from "@/types/obstacleTrg";
import { obstaclePrefill, terms } from "@/constants/app.constants";
import { TabsContent } from "@radix-ui/react-tabs";
import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Settings, Shield } from "lucide-react";
import { TabsTrigger } from "@/components/ui/tabs";

export default function ObstacleTrgPage() {
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);

    const [activeTab, setActiveTab] = useState<number>(0);
    const [savedData, setSavedData] = useState<TermData[]>(
        terms.map(() => ({ records: [] }))
    );

    const { register, handleSubmit, reset, control } = useForm<TermData>({
        defaultValues: { records: obstaclePrefill },
    });

    const watchedRecords = useWatch({ control, name: "records" });
    const totalMarks = watchedRecords?.reduce(
        (sum, r) => sum + (parseFloat(r.obtained) || 0),
        0
    );

    const onSubmit = (formData: TermData) => {
        const updated = [...savedData];
        updated[activeTab] = {
            records: formData.records.slice(0, obstaclePrefill.length),
        };
        setSavedData(updated);
        alert(`Data saved for ${terms[activeTab]}!`);
    };

    const handleTabChange = (index: number) => {
        setActiveTab(index);

        const term = savedData[index];
        if (term.records.length) {
            reset({
                records: term.records,
            });
        } else {
            reset({ records: obstaclePrefill });
        }
    };

    return (
        <DashboardLayout
            title="Assessment: Obstacle Training"
            description="Record of obstacle training performance and remarks."
        >
            <main className="p-6">
                {/* Breadcrumb */}
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: "/dashboard/milmgmt" },
                        { label: "Obstacle Training" },
                    ]}
                />

                {/* Selected Cadet */}
                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}
                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="obstacle-trg"
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
                    <TabsContent value="obstacle-trg">
                        <Card className="max-w-5xl mx-auto p-6 rounded-2xl shadow-xl bg-white">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-center text-primary">
                                    OBSTACLE TRAINING
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                {/* Term Tabs */}
                                <div className="flex justify-center mb-6 space-x-2">
                                    {terms.map((term, idx) => (
                                        <button
                                            key={term}
                                            type="button"
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

                                {/* Saved Table */}
                                <div className="mb-6">
                                    {savedData[activeTab].records.length === 0 ? (
                                        <p className="text-center text-gray-500 border rounded-lg p-4">
                                            No data submitted yet for this term.
                                        </p>
                                    ) : (
                                        <table className="w-full border text-sm rounded-lg overflow-hidden">
                                            <thead className="bg-gray-200">
                                                <tr>
                                                    <th className="p-2 border">No</th>
                                                    <th className="p-2 border">Obstacle</th>
                                                    <th className="p-2 border">Obtained</th>
                                                    <th className="p-2 border">Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {savedData[activeTab].records.map((r, i) => (
                                                    <tr key={i}>
                                                        <td className="p-2 border text-center">{i + 1}</td>
                                                        <td className="p-2 border">{r.obstacle}</td>
                                                        <td className="p-2 border text-center">
                                                            {r.obtained || "-"}
                                                        </td>
                                                        <td className="p-2 border text-center">
                                                            {r.remark || "-"}
                                                        </td>
                                                    </tr>
                                                ))}

                                                {/* Total Row */}
                                                <tr className="font-semibold bg-gray-50">
                                                    <td className="p-2 border text-center">{obstaclePrefill.length + 1}</td>
                                                    <td className="p-2 border">Total</td>
                                                    <td className="p-2 border text-center">
                                                        {totalMarks}
                                                    </td>
                                                    <td className="p-2 border text-center">—</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmit(onSubmit)}>
                                    <div className="overflow-x-auto border rounded-lg shadow">
                                        <table className="w-full border text-sm">
                                            <thead className="bg-gray-100 text-left">
                                                <tr>
                                                    <th className="p-2 border">No</th>
                                                    <th className="p-2 border">Obstacle</th>
                                                    <th className="p-2 border">Marks Obtained</th>
                                                    <th className="p-2 border">Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {obstaclePrefill.map((row, i) => (
                                                    <tr key={i}>
                                                        <td className="p-2 border text-center">{i + 1}</td>
                                                        <td className="p-2 border">{row.obstacle}</td>
                                                        <td className="p-2 border">
                                                            <Input
                                                                {...register(`records.${i}.obtained`)}
                                                                type="number"
                                                                placeholder="Marks"
                                                            />
                                                        </td>
                                                        <td className="p-2 border">
                                                            <Input
                                                                {...register(`records.${i}.remark`)}
                                                                type="text"
                                                                placeholder="Remark"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}

                                                {/* Total row */}
                                                <tr className="font-semibold bg-gray-50">
                                                    <td className="p-2 border text-center">{obstaclePrefill.length + 1}</td>
                                                    <td className="p-2 border">Total</td>
                                                    <td className="p-2 border text-center">{totalMarks}</td>
                                                    <td className="p-2 border text-center">—</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex justify-center gap-3 mt-6">
                                        <Button type="submit" className="bg-green-600 hover:bg-green-700">
                                            Save
                                        </Button>
                                        <Button type="button" variant="outline" onClick={() => reset({ records: obstaclePrefill })}>
                                            Reset
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="mil-trg">
                        <div className="text-center py-12">
                            <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-xl font-semibold">Military Training Section</h3>
                        </div>
                    </TabsContent>
                </DossierTab>
            </main>
        </DashboardLayout >
    );
}