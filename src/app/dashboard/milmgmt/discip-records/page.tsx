"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shield, ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { PageHeader } from "@/components/layout/PageHeader";
import DossierTab from "@/components/Tabs/DossierTab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DisciplineForm, DisciplineRow } from "@/types/dicp-records";
import { getDisciplineRecords, saveDisciplineRecords } from "@/app/lib/api/disciplineApi";

export default function DisciplineRecordsPage() {
    const router = useRouter();
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);
    const handleLogout = () => router.push("/login");

    const semesters = ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    const { control, handleSubmit, register, reset } = useForm<DisciplineForm>({
        defaultValues: {
            records: [{ ...defaultRow }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "records",
    });

    const [savedData, setSavedData] = useState<DisciplineRow[][]>(
        semesters.map(() => [])
    );

    const onSubmit = async (data: DisciplineForm) => {
        if (!selectedCadet?.ocId) {
            alert("Select a cadet first");
            return;
        }

        const payloads = data.records.map((row, idx) => ({
            semester: activeTab + 1,
            dateOfOffence: row.dateOfOffence || row.dateOfOffence,
            offence: row.offence || "",
            punishmentAwarded: row.punishmentAwarded || row.punishmentAwarded || row.punishment || null,
            awardedOn: row.dateOfAward || null,
            awardedBy: row.byWhomAwarded || null,
            pointsDelta: row.negativePts ? Number(row.negativePts) : 0,
            pointsCumulative: row.cumulative ? Number(row.cumulative) : 0,
        }));

        for (const p of payloads) {
            if (!p.dateOfOffence) {
                alert("Each row must have a Date of Offence.");
                return;
            }
            if (!p.offence || p.offence.trim().length === 0) {
                alert("Each row must have an offence description.");
                return;
            }
        }

        const resp = await saveDisciplineRecords(selectedCadet.ocId, payloads);
        if (!resp.ok) {
            console.error("Save failed:", resp.result, resp.payloads);
            alert("Failed to save discipline records — check console for details.");
            return;
        }

        const updated = [...savedData];
        const formattedRows = payloads.map((r, index) => ({
            serialNo: String(savedData[activeTab].length + index + 1),
            dateOfOffence: typeof r.dateOfOffence === "string" ? r.dateOfOffence : String(r.dateOfOffence),
            offence: r.offence,
            punishmentAwarded: r.punishmentAwarded ?? "-",
            dateOfAward: r.awardedOn ?? "-",
            byWhomAwarded: r.awardedBy ?? "-",
            negativePts: String(r.pointsDelta ?? ""),
            cumulative: String(r.pointsCumulative ?? ""),
        }));

        updated[activeTab] = [...updated[activeTab], ...formattedRows];
        setSavedData(updated);
        reset({ records: [{ ...defaultRow }] });

        alert("Discipline record(s) saved successfully!");
    };

    const fetchRecords = async () => {
        if (!selectedCadet?.ocId) return;

        setLoading(true);
        setError(null);

        try {
            const records = await getDisciplineRecords(selectedCadet.ocId);
            console.log("Fetched discipline records:", records);

            // Group by semester (1–6)
            const grouped = semesters.map(() => [] as DisciplineRow[]);
            for (const rec of records) {
                const semIndex = rec.semester - 1;
                if (semIndex >= 0 && semIndex < semesters.length) {
                    grouped[semIndex].push({
                        serialNo: String(grouped[semIndex].length + 1),
                        dateOfOffence: rec.dateOfOffence?.split("T")[0] || "-",
                        offence: rec.offence || "-",
                        punishmentAwarded: rec.punishmentAwarded || "-",
                        dateOfAward: rec.awardedOn?.split("T")[0] || "-",
                        byWhomAwarded: rec.awardedBy || "-",
                        negativePts: String(rec.pointsDelta ?? ""),
                        cumulative: String(rec.pointsCumulative ?? ""),
                    });
                }
            }

            setSavedData(grouped);
        } catch (err: any) {
            console.error(err);
            setError("Failed to load discipline records");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, [selectedCadet]);

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />
                <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <PageHeader
                        title="Discipline Records"
                        description="Log disciplinary actions and observations."
                        onLogout={handleLogout}
                    />

                    {/* Main Content */}
                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Dossier", href: "/dashboard/milmgmt" },
                                { label: "Discipline Records" },
                            ]}
                        />

                        {/* Selected Cadet */}
                        {selectedCadet && (
                            <div className="hidden md:flex sticky top-16 z-40">
                                <SelectedCadetTable selectedCadet={selectedCadet} />
                            </div>
                        )}

                        {/* Tabs */}
                        <DossierTab
                            tabs={dossierTabs}
                            defaultValue="discip-records"
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
                                                    <thead>
                                                        <tr className="bg-gray-100 text-left">
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
                                                                        {row[field as keyof DisciplineRow] || "-"}
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
                                                                            type={key.includes("date") ? "date" : "text"}
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
                </div>
            </div>
        </SidebarProvider>
    );
}
