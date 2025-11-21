"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { createMotivationAward, getMotivationAwards } from "@/app/lib/api/motivationAwardsApi";
import { listSportsAndGames, saveSportsGame } from "@/app/lib/api/sportsAndGamesApi";


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

    const { register, handleSubmit, reset, getValues } = useForm<SemesterData>({
        defaultValues: {
            spring: springPrefill,
            autumn: autumnPrefill,
            motivation: motivationPrefill,
        },
    });

    const handleSpringSubmit = async () => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        const semesterNumber = activeTab + 1;
        const ocId = selectedCadet.ocId;

        const springRows = getValues("spring");

        const newRows = springRows.filter((row) => !row.id);

        try {
            for (const row of newRows) {
                await saveSportsGame(ocId, {
                    semester: semesterNumber,
                    term: "spring",
                    sport: row.activity,
                    maxMarks: Number(row.maxMarks),
                    marksObtained: Number(row.obtained),
                });
            }

            toast.success("Spring term saved!");
            await loadSavedData(ocId);
            reset({ spring: springPrefill }, { keepValues: false });
        } catch (err) {
            toast.error("Failed to save Spring!");
        }
    };

    const handleAutumnSubmit = async () => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        const semesterNumber = activeTab + 1;
        const ocId = selectedCadet.ocId;

        const autumnRows = getValues("autumn");

        const newRows = autumnRows.filter((row) => !row.id);

        try {
            for (const row of newRows) {
                await saveSportsGame(ocId, {
                    semester: semesterNumber,
                    term: "autumn",
                    sport: row.activity,
                    maxMarks: Number(row.maxMarks),
                    marksObtained: Number(row.obtained),
                });
            }

            toast.success("Autumn term saved!");
            await loadSavedData(ocId);
            reset({ autumn: autumnPrefill }, { keepValues: false });
        } catch (err) {
            toast.error("Failed to save Autumn!");
        }
    };

    const handleMotivationSubmit = async () => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        const semesterNumber = activeTab + 1;
        const ocId = selectedCadet.ocId;

        const motivationRows = getValues("motivation");

        const newRows = motivationRows.filter((row) => !row.id);

        try {
            for (const row of newRows) {
                await createMotivationAward(ocId, {
                    semester: semesterNumber,
                    fieldName: row.activity,
                    motivationTitle: row.string,
                    maxMarks: Number(row.maxMarks),
                    marksObtained: Number(row.obtained || 0),
                });
            }

            toast.success("Motivation awards saved!");
            await loadSavedData(ocId);
            reset({ motivation: motivationPrefill }, { keepValues: false });
        } catch (err) {
            toast.error("Failed to save Motivation awards!");
        }
    };

    const onSubmit = async (formData: SemesterData) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        const semesterNumber = activeTab + 1;
        const ocId = selectedCadet.ocId;

        try {
            // SPRING
            const newSpringRows = formData.spring.filter((row) => !row.id);
            for (const row of newSpringRows) {
                await saveSportsGame(selectedCadet.ocId, {
                    semester: semesterNumber,
                    term: "spring",
                    sport: row.activity,
                    maxMarks: Number(row.maxMarks),
                    marksObtained: Number(row.obtained),
                });
            }

            // AUTUMN
            const newAutumnRows = formData.autumn.filter((row) => !row.id);
            for (const row of newAutumnRows) {
                await saveSportsGame(selectedCadet.ocId, {
                    semester: semesterNumber,
                    term: "autumn",
                    sport: row.activity,
                    maxMarks: Number(row.maxMarks),
                    marksObtained: Number(row.obtained),
                });
            }

            // MOTIVATION AWARDS
            const newMotivationRows = formData.motivation.filter((row) => !row.id);
            for (const row of newMotivationRows) {
                await createMotivationAward(ocId, {
                    semester: semesterNumber,
                    fieldName: row.activity,
                    motivationTitle: "motivation",
                    maxMarks: Number(row.maxMarks),
                    marksObtained: Number(row.obtained || 0),
                });
            }

            toast.success(`Created successfully for ${semesters[activeTab]}!`);
        } catch (err) {
            toast.error("Failed to save");
        }

        await loadSavedData(ocId);
    };

    const loadSavedData = async (ocId: string) => {
        try {
            const sportsRes = await listSportsAndGames(ocId);
            const motRes = await getMotivationAwards(ocId);

            const sportsItems = sportsRes.items ?? [];
            const motivationItems = motRes ?? [];

            const updated: SemesterData[] = semesters.map(() => ({
                spring: [],
                autumn: [],
                motivation: [],
            }));

            sportsItems.forEach((item) => {
                const idx = item.semester - 1;

                if (item.term === "spring") {
                    // Avoid duplicates by checking if the row already exists
                    if (!updated[idx].spring.some((r) => r.id === item.id)) {
                        updated[idx].spring.push({
                            id: item.id,
                            ocId: item.ocId,
                            term: "spring",
                            activity: item.sport,
                            string: "",
                            maxMarks: item.maxMarks,
                            obtained: item.marksObtained,
                        });
                    }
                }

                if (item.term === "autumn") {
                    // Avoid duplicates by checking if the row already exists
                    if (!updated[idx].autumn.some((r) => r.id === item.id)) {
                        updated[idx].autumn.push({
                            id: item.id,
                            ocId: item.ocId,
                            term: "autumn",
                            activity: item.sport,
                            string: "",
                            maxMarks: item.maxMarks,
                            obtained: item.marksObtained,
                        });
                    }
                }
            });

            motivationItems.forEach((item) => {
                const idx = item.semester - 1;

                // Avoid duplicates by checking if the row already exists
                if (!updated[idx].motivation.some((r) => r.id === item.id)) {
                    updated[idx].motivation.push({
                        id: item.id,
                        ocId: item.ocId,
                        term: "motivation",
                        activity: item.fieldName,
                        string: item.motivationTitle,
                        maxMarks: item.maxMarks,
                        obtained: item.marksObtained,
                    });
                }
            });

            setSavedData(updated);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load saved Sports & Awards data");
        }
    };

    useEffect(() => {
        if (!selectedCadet?.ocId) return;
        loadSavedData(selectedCadet.ocId);
    }, [selectedCadet?.ocId]);

    const handleRowUpdated = useCallback(
        (term: "spring" | "autumn" | "motivation", updatedRow: any) => {
            setSavedData((prev) => {
                const updated = [...prev];
                updated[activeTab] = {
                    ...updated[activeTab],
                    [term]: updated[activeTab][term].map((r: any) =>
                        r.id === updatedRow.id ? updatedRow : r
                    ),
                };
                return updated;
            });
        },
        [activeTab]
    );

    const handleRowDeleted = useCallback(
        (term: "spring" | "autumn" | "motivation", id: string) => {
            setSavedData((prev) => {
                const updated = [...prev];
                updated[activeTab] = {
                    ...updated[activeTab],
                    [term]: updated[activeTab][term].filter((r) => r.id !== id),
                };
                return updated;
            });
        },
        [activeTab]
    );

    const memoizedSpringRows = useMemo(() => springPrefill, []);
    const memoizedAutumnRows = useMemo(() => autumnPrefill, []);
    const memoizedMotivationRows = useMemo(() => motivationPrefill, []);

    const memoizedSavedSpringRows = useMemo(() => savedData[activeTab].spring, [savedData, activeTab]);
    const memoizedSavedAutumnRows = useMemo(() => savedData[activeTab].autumn, [savedData, activeTab]);
    const memoizedSavedMotivationRows = useMemo(() => savedData[activeTab].motivation, [savedData, activeTab]);

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
                                <form onSubmit={handleSubmit(handleSpringSubmit)}>
                                    <SportsGamesTable
                                        title="SPRING TERM"
                                        termKey="spring"
                                        rows={memoizedSpringRows}
                                        savedRows={memoizedSavedSpringRows}
                                        register={register}
                                        onRowUpdated={(updatedRow) => handleRowUpdated("spring", updatedRow)}
                                        onRowDeleted={(id) => handleRowDeleted("spring", id)}
                                    />

                                    <div className="flex justify-center mt-4">
                                        <Button type="submit" className="bg-green-600">Save Spring</Button>
                                    </div>
                                </form>

                                <form onSubmit={handleSubmit(handleAutumnSubmit)}>
                                    <SportsGamesTable
                                        title="AUTUMN TERM"
                                        termKey="autumn"
                                        rows={memoizedAutumnRows}
                                        savedRows={memoizedSavedAutumnRows}
                                        register={register}
                                        onRowUpdated={(updatedRow) => handleRowUpdated("autumn", updatedRow)}
                                        onRowDeleted={(id) => handleRowDeleted("autumn", id)}
                                    />

                                    <div className="flex justify-center mt-4">
                                        <Button type="submit" className="bg-green-600">Save Autumn</Button>
                                    </div>
                                </form>

                                <form onSubmit={handleSubmit(handleMotivationSubmit)}>
                                    <SportsGamesTable
                                        title="MOTIVATION AWARDS"
                                        termKey="motivation"
                                        rows={memoizedMotivationRows}
                                        savedRows={memoizedSavedMotivationRows}
                                        register={register}
                                        onRowUpdated={(updatedRow) => handleRowUpdated("motivation", updatedRow)}
                                        onRowDeleted={(id) => handleRowDeleted("motivation", id)}
                                    />

                                    <div className="flex justify-center mt-4">
                                        <Button type="submit" className="bg-green-600">Save Motivation</Button>
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