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

import { ClubRow, DrillRow, FormValues } from "@/types/club-detls";
import { defaultClubRows, defaultDrillRows, romanToNumber } from "@/constants/app.constants";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { ChevronDown, Shield } from "lucide-react";
import DossierTab from "@/components/Tabs/DossierTab";
import ClubForm from "@/components/club_drill/ClubForm";
import DrillForm from "@/components/club_drill/DrillForm";
import AchievementsForm from "@/components/club_drill/AchievementsForm";
import { createOcClub, getOcClubs, updateOcClub } from "@/app/lib/api/clubApi";
import { toast } from "sonner";
import { updateClub } from "@/app/db/queries/oc";

export default function ClubDetailsAndDrillPage() {
    const selectedCadet = useSelector((s: RootState) => s.cadet.selectedCadet);
    const [clubSaved, setClubSaved] = useState(false);
    const [drillSaved, setDrillSaved] = useState(false);
    const [achSaved, setAchSaved] = useState(false);
    const [savedData, setSavedData] = useState<FormValues>({
        clubRows: defaultClubRows,
        drillRows: defaultDrillRows,
        splAchievementsList: ["", "", "", ""],
    });

    const { register, control, handleSubmit, reset, watch, setValue, getValues } =
        useForm<FormValues>({
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
            (acc, r) => ({
                m1: acc.m1 + Number(r.m1 || 0),
                m2: acc.m2 + Number(r.m2 || 0),
                a1c1: acc.a1c1 + Number(r.a1c1 || 0),
                a2c2: acc.a2c2 + Number(r.a2c2 || 0),
            }),
            { m1: 0, m2: 0, a1c1: 0, a2c2: 0 }
        );

        setValue("drillRows.3", {
            ...watchedDrill[3],
            ...totals,
        });
    }, [watchedDrill, setValue]);

    const onSubmitClub = async () => {
        try {
            const values = getValues();
            if (!selectedCadet) throw new Error("No cadet selected");

            const filledRows = values.clubRows.filter(row =>
                row.clubName?.trim() ||
                row.splAchievement?.trim() ||
                row.remarks?.trim()
            );

            for (const [index, row] of filledRows.entries()) {
                const body = {
                    semester: romanToNumber[row.semester],
                    clubName: row.clubName?.trim() || "",
                    specialAchievement: row.splAchievement?.trim() || "",
                    remark: row.remarks?.trim() || "",
                };
                if (row.id) {
                    await updateOcClub(selectedCadet.ocId, row.id, body);
                } else {
                    const created = await createOcClub(selectedCadet.ocId, body);
                    row.id = created.id;

                    setValue(`clubRows.${index}.id`, created.id);
                }
            }

            toast.success("Club records saved successfully");
            setSavedData(prev => ({ ...prev, clubRows: values.clubRows }));
            setClubSaved(true);

        } catch (error) {
            console.error("Failed to save club records:", error);
            toast.error("Failed to save club details");
        }
    };

    async function loadClubData() {
        if (!selectedCadet?.ocId) return;

        try {
            const res = await getOcClubs(selectedCadet.ocId);
            const clubs = res?.items ?? [];

            const mapped = defaultClubRows.map(row => {
                const apiData = clubs.find(
                    (x: any) => x.semester === romanToNumber[row.semester]
                );

                return {
                    id: apiData?.id || null,
                    semester: row.semester,
                    clubName: apiData?.clubName || "",
                    splAchievement: apiData?.specialAchievement || "",
                    remarks: apiData?.remark || "",
                };
            });

            setValue("clubRows", mapped);
            setSavedData(prev => ({ ...prev, clubRows: mapped }));
            setClubSaved(true);

        } catch (error) {
            console.error("Failed to fetch club data:", error);
        }
    }

    useEffect(() => {
        loadClubData();
    }, [selectedCadet, setValue]);


    const onSubmitDrill = () => {
        const values = getValues();
        setSavedData(prev => ({ ...prev, drillRows: values.drillRows }));
        setDrillSaved(true);
    };

    const onSubmitAchievements = () => {
        const values = getValues();
        setSavedData(prev => ({ ...prev, splAchievementsList: values.splAchievementsList }));
        setAchSaved(true);
    };

    const onResetClub = () => {
        reset({ ...getValues(), clubRows: defaultClubRows });
    };

    const onResetDrill = () => {
        reset({ ...getValues(), drillRows: defaultDrillRows });
    };

    const onResetAll = () => {
        reset({
            clubRows: defaultClubRows,
            drillRows: defaultDrillRows,
            splAchievementsList: ["", "", "", ""],
        });
        setClubSaved(false);
        setDrillSaved(false);
        setAchSaved(false);
    };

    return (
        <DashboardLayout
            title="Assessment: Club Details & Drill"
            description="Maintain cadet’s club involvement and drill performance records."
        >
            <main className="flex-1 p-6">
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
                        <Card className="max-w-5xl mx-auto p-6 shadow-lg rounded-2xl bg-white">
                            <CardHeader>
                                <CardTitle className="text-center text-primary font-bold">
                                    CLUB DETAILS & DRILL ASSESSMENT
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                {/* CLUB SECTION */}
                                {!clubSaved ? (
                                    <ClubForm
                                        register={register}
                                        fields={clubFields}
                                        getValues={getValues}
                                        onSubmit={handleSubmit(onSubmitClub)}
                                        onReset={onResetClub}
                                    />
                                ) : (
                                    <div>
                                        <h2 className="font-bold text-primary mb-2">Saved Club Records</h2>

                                        <table className="w-full border text-sm">
                                            <thead className="bg-blue-50">
                                                <tr>
                                                    <th className="border p-2">Semester</th>
                                                    <th className="border p-2">Club</th>
                                                    <th className="border p-2">Achievement</th>
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
                                        <div className="flex justify-center items-center">
                                            <Button onClick={() => setClubSaved(false)} className="mt-4 bg-blue-600 text-white">
                                                Edit Club
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* DRILL SECTION */}
                                {!drillSaved ? (
                                    <DrillForm
                                        register={register}
                                        fields={drillFields}
                                        onSubmit={handleSubmit(onSubmitDrill)}
                                        onReset={onResetDrill}
                                    />
                                ) : (
                                    <div>
                                        <h2 className="font-bold text-primary mb-2">Saved Drill Records</h2>

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
                                        <div className="flex justify-center items-center">
                                            <Button onClick={() => setDrillSaved(false)} className="mt-4 bg-blue-600 text-white">
                                                Edit Drill
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* ACHIEVEMENTS SECTION */}
                                {!achSaved ? (
                                    <AchievementsForm
                                        register={register}
                                        onSubmit={handleSubmit(onSubmitAchievements)}
                                        onReset={() =>
                                            reset({
                                                ...getValues(),
                                                splAchievementsList: ["", "", "", ""],
                                            })
                                        }
                                    />
                                ) : (
                                    <div>
                                        <h2 className="font-bold text-primary mb-2">Saved Achievements</h2>
                                        <ul className="list-disc pl-6 space-y-1">
                                            {savedData.splAchievementsList
                                                .filter((s) => s)
                                                .map((s, i) => (
                                                    <li key={i}>{s}</li>
                                                ))}
                                        </ul>

                                        <div className="flex justify-center items-center">
                                            <Button onClick={() => setAchSaved(false)} className="mt-4 bg-blue-600 text-white">
                                                Edit Achievements
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
