"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─────────────── TYPES ───────────────
interface Row {
    activity: string;
    string: string;
    maxMarks: string | number;
    obtained: string;
}

interface SemesterData {
    spring: Row[];
    autumn: Row[];
    motivation: Row[];
}

// ─────────────── PREFILL DATA ───────────────
const springPrefill: Row[] = [
    { activity: "X - Country", string: "", maxMarks: 30, obtained: "" },
    { activity: "Basket Ball", string: "", maxMarks: 15, obtained: "" },
    { activity: "Football", string: "", maxMarks: 15, obtained: "" },
    { activity: "Squash", string: "", maxMarks: 15, obtained: "" },
    { activity: "Wg Team", string: "", maxMarks: 25, obtained: "" },
];

const autumnPrefill: Row[] = [
    { activity: "X - Country", string: "", maxMarks: 30, obtained: "" },
    { activity: "Hockey", string: "", maxMarks: 15, obtained: "" },
    { activity: "Volley Ball", string: "", maxMarks: 15, obtained: "" },
    { activity: "Tennis", string: "", maxMarks: 15, obtained: "" },
    { activity: "Wg Team", string: "", maxMarks: 25, obtained: "" },
];

const motivationPrefill: Row[] = [
    { activity: "Merit Card", string: "", maxMarks: "", obtained: "" },
    { activity: "Half Blue", string: "", maxMarks: "", obtained: "" },
    { activity: "Blue", string: "", maxMarks: "", obtained: "" },
    { activity: "Blazer", string: "", maxMarks: "", obtained: "" },
];

// ─────────────── COMPONENT ───────────────
export default function SportsGamesPage() {
    const semesters = ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];
    const [activeTab, setActiveTab] = useState(0);

    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);

    const [savedData, setSavedData] = useState<SemesterData[]>(
        semesters.map(() => ({
            spring: [],
            autumn: [],
            motivation: [],
        }))
    );

    // ─────────────── FORM SETUP ───────────────
    const { register, handleSubmit, reset } = useForm<SemesterData>({
        defaultValues: {
            spring: springPrefill,
            autumn: autumnPrefill,
            motivation: motivationPrefill,
        },
    });

    const onSubmit = (formData: SemesterData) => {
        const updated = [...savedData];
        updated[activeTab] = { ...formData };
        setSavedData(updated);
        alert(`✅ Data saved for ${semesters[activeTab]}!`);
    };

    const renderTable = (termKey: keyof SemesterData, title: string, rows: Row[]) => (
        <div className="mb-10">
            <h2 className="font-semibold text-md mb-2 underline">{title}</h2>

            {/* Saved Data Table */}
            <div className="overflow-x-auto border rounded-lg shadow mb-4">
                {savedData[activeTab][termKey].length === 0 ? (
                    <p className="text-center p-4 text-gray-500">
                        No data submitted yet for this term.
                    </p>
                ) : (
                    <table className="w-full border text-sm">
                        <thead className="bg-gray-100 text-left">
                            <tr>
                                <th className="p-2 border">Games / Awards</th>
                                <th className="p-2 border">String</th>
                                <th className="p-2 border">Max Marks</th>
                                <th className="p-2 border">Marks Obtained</th>
                            </tr>
                        </thead>
                        <tbody>
                            {savedData[activeTab][termKey].map((row, i) => (
                                <tr key={i}>
                                    <td className="p-2 border">{row.activity}</td>
                                    <td className="p-2 border">{row.string || "-"}</td>
                                    <td className="p-2 border">{row.maxMarks || "-"}</td>
                                    <td className="p-2 border">{row.obtained || "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Input Form Table */}
            <div className="overflow-x-auto border rounded-lg shadow">
                <table className="w-full border text-sm">
                    <thead className="bg-gray-100 text-left">
                        <tr>
                            <th className="p-2 border">Games / Awards</th>
                            <th className="p-2 border">String</th>
                            <th className="p-2 border">Max Marks</th>
                            <th className="p-2 border">Marks Obtained</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={index}>
                                <td className="p-2 border">{row.activity}</td>
                                <td className="p-2 border">
                                    <Input
                                        {...register(`${termKey}.${index}.string` as const)}
                                        type="text"
                                        defaultValue={row.string}
                                    />
                                </td>
                                <td className="p-2 border">
                                    <Input
                                        value={row.maxMarks}
                                        disabled
                                        className="bg-gray-100"
                                    />
                                </td>
                                <td className="p-2 border">
                                    <Input
                                        {...register(`${termKey}.${index}.obtained` as const)}
                                        type="number"
                                        defaultValue={row.obtained}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />
                <div className="flex-1 flex flex-col">
                    <PageHeader
                        title="Assessment: Sports / Games & Motivation Awards"
                        description="Enter marks for sports/games and record motivation awards for the cadet."
                    />

                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Dossier", href: "/dashboard/milmgmt" },
                                { label: "Assessment - Sports/Games" },
                            ]}
                        />

                        {selectedCadet && (
                            <div className="hidden md:flex sticky top-16 z-40 mb-6">
                                <SelectedCadetTable selectedCadet={selectedCadet} />
                            </div>
                        )}

                        <Card className="max-w-6xl mx-auto p-6 rounded-2xl shadow-xl bg-white">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-center text-primary">
                                    SPORTS / GAMES ASSESSMENT & MOTIVATION AWARDS
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

                                {/* Form Section */}
                                <form onSubmit={handleSubmit(onSubmit)}>
                                    {renderTable("spring", "SPRING TERM", springPrefill)}
                                    {renderTable("autumn", "AUTUMN TERM", autumnPrefill)}
                                    {renderTable("motivation", "MOTIVATION AWARDS", motivationPrefill)}

                                    <div className="flex justify-center gap-3 mt-6">
                                        <Button
                                            type="submit"
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            Save All Tables
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                reset({
                                                    spring: springPrefill,
                                                    autumn: autumnPrefill,
                                                    motivation: motivationPrefill,
                                                })
                                            }
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
