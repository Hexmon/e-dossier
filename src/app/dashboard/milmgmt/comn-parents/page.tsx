"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Shield, ChevronDown } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { PageHeader } from "@/components/layout/PageHeader";
import DossierTab from "@/components/Tabs/DossierTab";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─────────────── TYPES ───────────────
interface ParentCommRow {
    serialNo: string;
    letterNo: string;
    date: string;
    teleCorres: string;
    briefContents: string;
    sigPICdr: string;
}

interface ParentCommForm {
    records: ParentCommRow[];
}

// ─────────────── COMPONENT ───────────────

export default function ParentCommnPage() {
    const router = useRouter();
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);
    const handleLogout = () => router.push("/login");

    const semesters = ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];
    const [activeTab, setActiveTab] = useState(0);

    const defaultRow = {
        serialNo: "",
        letterNo: "",
        date: "",
        teleCorres: "",
        briefContents: "",
        sigPICdr: "",
    };

    // ─────────────── HOOK FORM SETUP ───────────────
    const { control, handleSubmit, register, reset } = useForm<ParentCommForm>({
        defaultValues: {
            records: [{ ...defaultRow }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "records",
    });

    const [savedData, setSavedData] = useState<ParentCommRow[][]>(
        semesters.map(() => [])
    );

    const onSubmit = (data: ParentCommForm) => {
        const newEntries = data.records.map((row, i) => ({
            ...row,
            serialNo: String(savedData[activeTab].length + i + 1),
        }));

        const updated = [...savedData];
        updated[activeTab] = [...updated[activeTab], ...newEntries];
        setSavedData(updated);

        reset({ records: [{ ...defaultRow }] });
        alert("✅ Record saved successfully!");
    };

    // ─────────────── RENDER ───────────────

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />
                <div className="flex-1 flex flex-col">
                    <PageHeader
                        title="Record of Communication with Parents/Guardian"
                        description="Maintain communication details with parents or guardians."
                        onLogout={handleLogout}
                    />

                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Dossier", href: "/dashboard/milmgmt" },
                                { label: "Parent Communication" },
                            ]}
                        />

                        {selectedCadet && (
                            <div className="hidden md:flex sticky top-16 z-40">
                                <SelectedCadetTable selectedCadet={selectedCadet} />
                            </div>
                        )}

                        {/* Dossier Tabs */}
                        <DossierTab
                            tabs={dossierTabs}
                            defaultValue="comn-parents"
                            extraTabs={
                                <div className="flex items-center justify-center">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <TabsTrigger
                                                value="dossier-insp"
                                                className="flex items-center gap-2 border border-transparent hover:!border-blue-700"
                                            >
                                                <Shield className="h-4 w-4" />
                                                Mil-Trg
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            </TabsTrigger>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                                            {militaryTrainingCards.map((card) => (
                                                <DropdownMenuItem key={card.to} asChild>
                                                    <a href={card.to} className="flex items-center gap-2 w-full">
                                                        <card.icon className={`h-4 w-4 ${card.color}`} />
                                                        <span>{card.title}</span>
                                                    </a>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            }
                        >
                            <TabsContent value="comn-parents" className="space-y-6">
                                <Card className="max-w-6xl mx-auto p-6 rounded-2xl shadow-xl bg-white">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-semibold text-center text-primary">
                                            RECORD OF COMMUNICATION WITH PARENTS / GUARDIAN
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
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {savedData[activeTab].map((row, index) => (
                                                            <tr key={index}>
                                                                {Object.keys(defaultRow).map((field) => (
                                                                    <td key={field} className="p-2 border">
                                                                        {row[field as keyof ParentCommRow] || "-"}
                                                                    </td>
                                                                ))}
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
                                                                {Object.keys(defaultRow).map((key) => (
                                                                    <td key={key} className="p-2 border">
                                                                        <Input
                                                                            {...register(`records.${index}.${key}` as const)}
                                                                            type={key === "date" ? "date" : "text"}
                                                                        />
                                                                    </td>
                                                                ))}
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
                </div>
            </div>
        </SidebarProvider>
    );
}
