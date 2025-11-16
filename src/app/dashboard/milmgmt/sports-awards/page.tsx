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
import { toast } from "sonner";
import { Row, SemesterData } from "@/types/sportsAwards";
import { autumnPrefill, motivationPrefill, springPrefill } from "@/constants/app.constants";
import SportsGamesTable from "@/components/sports/SportsTable";
import DossierTab from "@/components/Tabs/DossierTab";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { ChevronDown, Shield } from "lucide-react";
import { createMotivationAward } from "@/app/lib/api/motivationAwardsApi";
import { saveSportsGame } from "@/app/lib/api/sportsAndGamesApi";


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

    const { register, handleSubmit, reset } = useForm<SemesterData>({
        defaultValues: {
            spring: springPrefill,
            autumn: autumnPrefill,
            motivation: motivationPrefill,
        },
    });

    const onSubmit = async (formData: SemesterData) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        const semesterNumber = activeTab + 1;
        const ocId = selectedCadet.ocId;

        try {
            // SPRING
            for (const row of formData.spring) {
                await saveSportsGame(selectedCadet.ocId, {
                    semester: semesterNumber,
                    term: "spring",
                    sport: row.activity,
                    maxMarks: Number(row.maxMarks),
                    marksObtained: Number(row.obtained)
                });
            }

            // AUTUMN
            for (const row of formData.autumn) {
                await saveSportsGame(selectedCadet.ocId, {
                    semester: semesterNumber,
                    term: "autumn",
                    sport: row.activity,
                    maxMarks: Number(row.maxMarks),
                    marksObtained: Number(row.obtained)
                });
            }

            //MOTIVATION AWARDS
            for (const row of formData.motivation) {
                await createMotivationAward(ocId, {
                    semester: semesterNumber,
                    fieldName: row.activity,
                    motivationTitle: row.string,
                    maxMarks: Number(row.maxMarks),
                    marksObtained: Number(row.obtained || 0),
                });
            }

            toast.success(`Saved successfully for ${semesters[activeTab]}!`);

        } catch (err) {
            toast.error("Failed to save");
        }

        const updated = [...savedData];
        updated[activeTab] = { ...formData };
        setSavedData(updated);
    };

    return (
        <DashboardLayout
            title="Assessment: Sports / Games & Motivation Awards"
            description="Enter marks for sports and motivation awards."
        >
            <main className="p-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: "/dashboard/milmgmt" },
                        { label: "Sports - Games Assessment" },
                    ]}
                />

                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}
                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="sports-awards"
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
                    <TabsContent value="sports-awards" className="space-y-6">
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

                                {/* Form */}
                                <form onSubmit={handleSubmit(onSubmit)}>
                                    <SportsGamesTable
                                        title="SPRING TERM"
                                        termKey="spring"
                                        rows={springPrefill}
                                        savedRows={savedData[activeTab].spring}
                                        register={register}
                                    />

                                    <SportsGamesTable
                                        title="AUTUMN TERM"
                                        termKey="autumn"
                                        rows={autumnPrefill}
                                        savedRows={savedData[activeTab].autumn}
                                        register={register}
                                    />

                                    <SportsGamesTable
                                        title="MOTIVATION AWARDS"
                                        termKey="motivation"
                                        rows={motivationPrefill}
                                        savedRows={savedData[activeTab].motivation}
                                        register={register}
                                    />

                                    <div className="flex justify-center gap-3 mt-6">
                                        <Button type="submit" className="bg-green-600 hover:bg-green-700">
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
                    </TabsContent>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}