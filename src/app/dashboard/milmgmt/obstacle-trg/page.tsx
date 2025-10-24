"use client";

import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Row {
    obstacle: string;
    obtained: string;
    remark: string;
}

interface TermData {
    records: Row[];
}

const terms = ["IV TERM", "V TERM", "VI TERM"];

const obstaclePrefill: Row[] = [
    { obstacle: "EX (15 Mks)", obtained: "", remark: "" },
    { obstacle: "Good (12 Mks)", obtained: "", remark: "" },
    { obstacle: "Sat (09 Mks)", obtained: "", remark: "" },
    { obstacle: "Fail (Nil)", obtained: "", remark: "" },
];

export default function ObstacleTrgPage() {
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);

    const [activeTab, setActiveTab] = useState<number>(0);
    const [savedData, setSavedData] = useState<TermData[]>(
        terms.map(() => ({ records: [] }))
    );

    const { register, handleSubmit, reset, control, setValue } = useForm<TermData>({
        defaultValues: { records: obstaclePrefill },
    });

    const watchedRecords = useWatch({ control, name: "records" });
    const totalMarks = watchedRecords?.reduce(
        (sum, r) => sum + (parseFloat(r.obtained) || 0),
        0
    );

    // useEffect(() => {
    //     setValue("records", [
    //         ...(watchedRecords?.slice(0, obstaclePrefill.length) || []),
    //         { obstacle: "Total", maxMarks: obstaclePrefill.reduce((m, r) => m + r.maxMarks, 0), obtained: totalMarks.toString(), remark: "" },
    //     ]);
    // }, [totalMarks]);

    const onSubmit = (formData: TermData) => {
        const updated = [...savedData];
        updated[activeTab] = {
            records: formData.records.slice(0, obstaclePrefill.length) // exclude the auto-added total row
        };
        setSavedData(updated);
        alert(` Data saved for ${terms[activeTab]}!`);
    };

    const handleTabChange = (index: number) => {
        setActiveTab(index);
        // load saved data into form
        const term = savedData[index];
        if (term.records.length) {
            reset({ records: term.records.concat({ obstacle: "Total", maxMarks: obstaclePrefill.reduce((m, r) => m + r.maxMarks, 0), obtained: term.records.reduce((sum, r) => sum + (parseFloat(r.obtained) || 0), 0).toString(), remark: "" }) });
        } else {
            reset({ records: obstaclePrefill });
        }
    };

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />
                <div className="flex-1 flex flex-col">
                    <PageHeader
                        title="Assessment: Obstacle Training"
                        description="Record of obstacle training performance and remarks."
                    />

                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Dossier", href: "/dashboard/milmgmt" },
                                { label: "Obstacle Training" },
                            ]}
                        />

                        {selectedCadet && (
                            <div className="hidden md:flex sticky top-16 z-40 mb-6">
                                <SelectedCadetTable selectedCadet={selectedCadet} />
                            </div>
                        )}

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
                                                        <td className="p-2 border text-center">{r.obtained || "-"}</td>
                                                        <td className="p-2 border text-center">{r.remark || "-"}</td>
                                                    </tr>
                                                ))}
                                                <tr className="font-semibold bg-gray-50">
                                                    <td className="p-2 border text-center">{obstaclePrefill.length + 1}</td>
                                                    <td className="p-2 border">Total</td>
                                                    <td className="p-2 border text-center">{obstaclePrefill.reduce((m, r) => m + r.maxMarks, 0)}</td>
                                                    <td className="p-2 border text-center">
                                                        {savedData[activeTab].records.reduce((sum, r) => sum + (parseFloat(r.obtained) || 0), 0)}
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
                                                                {...register(`records.${i}.obtained` as const)}
                                                                type="number"
                                                                placeholder="Enter Marks"
                                                                className="w-full"
                                                            />
                                                        </td>
                                                        <td className="p-2 border">
                                                            <Input
                                                                {...register(`records.${i}.remark` as const)}
                                                                type="text"
                                                                placeholder="Enter Remark"
                                                                className="w-full"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="font-semibold bg-gray-50">
                                                    <td className="p-2 border text-center">{obstaclePrefill.length + 1}</td>
                                                    <td className="p-2 border">Total</td>
                                                    <td className="p-2 border text-center">{obstaclePrefill.reduce((m, r) => m + r.maxMarks, 0)}</td>
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
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => reset({ records: obstaclePrefill })}
                                        >
                                            Reset
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
