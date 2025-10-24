"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
    test: string;
    timing10Label: string;
    distance10: string;
    timing20Label: string;
    distance20: string;
    timing30Label: string;
    distance30: string;
    marks: string;
    remark: string;
}

interface TermData {
    records: Row[];
}

const terms = ["IV TERM", "V TERM", "VI TERM"];

const tablePrefill: Row[] = [
    {
        test: "Ex (30 Mks)",
        timing10Label: "1hr 15 mins",
        distance10: "",
        timing20Label: "2hr 40 mins",
        distance20: "",
        timing30Label: "4hr",
        distance30: "",
        marks: "30",
        remark: "",
    },
    {
        test: "Good (21 Mks)",
        timing10Label: "1hr 30 mins",
        distance10: "",
        timing20Label: "2hr 45 mins",
        distance20: "",
        timing30Label: "4hr 7 mins 30 secs",
        distance30: "",
        marks: "21",
        remark: "",
    },
    {
        test: "Sat (12 Mks)",
        timing10Label: "1hr 35 mins",
        distance10: "",
        timing20Label: "2hr 50 mins",
        distance20: "",
        timing30Label: "4hr 10 mins",
        distance30: "",
        marks: "12",
        remark: "",
    },
    {
        test: "Fail (Nil)",
        timing10Label: "Beyond 1hr 35 mins",
        distance10: "",
        timing20Label: "Beyond 2hr 50 mins",
        distance20: "",
        timing30Label: "Beyond 4hr 10 mins",
        distance30: "",
        marks: "Nil",
        remark: "",
    },
    {
        test: "Marks",
        timing10Label: "",
        distance10: "",
        timing20Label: "",
        distance20: "",
        timing30Label: "",
        distance30: "",
        marks: "",
        remark: "",
    },
];

export default function SpeedMarchPage() {
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);
    const [activeTab, setActiveTab] = useState<number>(0);
    const [savedData, setSavedData] = useState<TermData[]>(terms.map(() => ({ records: [] })));

    const { register, handleSubmit, reset } = useForm<TermData>({
        defaultValues: { records: tablePrefill },
    });

    const onSubmit = (formData: TermData) => {
        const updated = [...savedData];
        updated[activeTab] = { records: formData.records };
        setSavedData(updated);
        alert(` Data saved for ${terms[activeTab]}!`);
    };

    const handleTabChange = (index: number) => {
        setActiveTab(index);
        const term = savedData[index];
        if (term.records.length) reset({ records: term.records });
        else reset({ records: tablePrefill });
    };

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />
                <div className="flex-1 flex flex-col">
                    <PageHeader
                        title="Assessment: Speed March / Run Back"
                        description="Timing standards and marks for Speed March and Run Back."
                    />

                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Dossier", href: "/dashboard/milmgmt" },
                                { label: "Speed March-Run Back" },
                            ]}
                        />

                        {selectedCadet && (
                            <div className="hidden md:flex sticky top-16 z-40 mb-6">
                                <SelectedCadetTable selectedCadet={selectedCadet} />
                            </div>
                        )}

                        <Card className="max-w-7xl mx-auto p-6 rounded-2xl shadow-xl bg-white">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-center text-primary">
                                    SPEED MARCH / RUN BACK
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                {/* Semester Tabs */}
                                <div className="flex justify-center mb-6 space-x-2">
                                    {terms.map((term, idx) => (
                                        <button
                                            key={term}
                                            type="button"
                                            onClick={() => handleTabChange(idx)}
                                            className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === idx ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                                                }`}
                                        >
                                            {term}
                                        </button>
                                    ))}
                                </div>

                                {/* Saved Table */}
                                {savedData[activeTab].records.length > 0 && (
                                    <div className="mb-6 overflow-x-auto border rounded-lg shadow">
                                        <table className="w-full border text-sm rounded-lg overflow-hidden">
                                            <thead className="bg-gray-200">
                                                <tr>
                                                    <th className="p-2 border text-left">Test</th>
                                                    <th className="p-2 border text-center">Timings</th>
                                                    <th className="p-2 border text-center">10 KM</th>
                                                    <th className="p-2 border text-center">Timings</th>
                                                    <th className="p-2 border text-center">20 KM</th>
                                                    <th className="p-2 border text-center">Timings</th>
                                                    <th className="p-2 border text-center">30 KM</th>
                                                    <th className="p-2 border text-center">Full Marks</th>
                                                    <th className="p-2 border text-center">Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {savedData[activeTab].records.map((r, i) => (
                                                    <tr key={i}>
                                                        <td className="p-2 border">{r.test}</td>
                                                        <td className="p-2 border text-center">{r.timing10Label}</td>
                                                        <td className="p-2 border text-center">{r.distance10}</td>
                                                        <td className="p-2 border text-center">{r.timing20Label}</td>
                                                        <td className="p-2 border text-center">{r.distance20}</td>
                                                        <td className="p-2 border text-center">{r.timing30Label}</td>
                                                        <td className="p-2 border text-center">{r.distance30}</td>
                                                        <td className="p-2 border text-center">{r.marks}</td>
                                                        <td className="p-2 border text-center">{r.remark || "-"}</td>
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
                                            <thead className="bg-gray-100 text-left">
                                                <tr>
                                                    <th className="p-2 border">Test</th>
                                                    <th className="p-2 border text-center">Timings</th>
                                                    <th className="p-2 border text-center">10 KM</th>
                                                    <th className="p-2 border text-center">Timings</th>
                                                    <th className="p-2 border text-center">20 KM</th>
                                                    <th className="p-2 border text-center">Timings</th>
                                                    <th className="p-2 border text-center">30 KM</th>
                                                    <th className="p-2 border text-center">Full Marks</th>
                                                    <th className="p-2 border text-center">Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tablePrefill.map((row, i) => (
                                                    <tr key={i}>
                                                        <td className="p-2 border !w-30">{row.test}</td>
                                                        <td className="p-2 border text-center">
                                                            <Input {...register(`records.${i}.timing10Label`)} defaultValue={row.timing10Label} />
                                                        </td>
                                                        <td className="p-2 border text-center">
                                                            <Input {...register(`records.${i}.distance10`)} defaultValue={row.distance10} />
                                                        </td>
                                                        <td className="p-2 border text-center">
                                                            <Input {...register(`records.${i}.timing20Label`)} defaultValue={row.timing20Label} />
                                                        </td>
                                                        <td className="p-2 border text-center">
                                                            <Input {...register(`records.${i}.distance20`)} defaultValue={row.distance20} />
                                                        </td>
                                                        <td className="p-2 border text-center">
                                                            <Input {...register(`records.${i}.timing30Label`)} defaultValue={row.timing30Label} />
                                                        </td>
                                                        <td className="p-2 border text-center">
                                                            <Input {...register(`records.${i}.distance30`)} defaultValue={row.distance30} />
                                                        </td>
                                                        <td className="p-2 border text-center">
                                                            <Input {...register(`records.${i}.marks`)} defaultValue={row.marks} />
                                                        </td>
                                                        <td className="p-2 border text-center">
                                                            <Input {...register(`records.${i}.remark`)} placeholder="Enter remark" />
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
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
