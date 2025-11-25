"use client";

import React, { useEffect, useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
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
import { createOcDrill, listOcDrill, updateOcDrill } from "@/app/lib/api/drillApi";
import { createOcAchievement, deleteOcAchievement, listOcAchievements, updateOcAchievement } from "@/app/lib/api/achievementApi";

export default function ClubDetailsAndDrillPage() {
    const selectedCadet = useSelector((s: RootState) => s.cadet.selectedCadet);
    const [clubSaved, setClubSaved] = useState(false);
    const [drillSaved, setDrillSaved] = useState(false);
    const [achSaved, setAchSaved] = useState(false);
    const [savedData, setSavedData] = useState<FormValues>({
        clubRows: defaultClubRows,
        drillRows: defaultDrillRows,
        achievements: [{ id: null, achievement: "" }],
    });

    const { register, control, handleSubmit, reset, watch, setValue, getValues, trigger } =
        useForm<FormValues>({
            defaultValues: {
                clubRows: defaultClubRows,
                drillRows: defaultDrillRows,
                achievements: [{ id: null, achievement: "" }],
            },
        });

    const { fields: clubFields } = useFieldArray({ control, name: "clubRows" });
    const { fields: drillFields } = useFieldArray({ control, name: "drillRows" });
    const { fields: achievementFields, append: addAchievement, remove: removeAchievement, } = useFieldArray({ control, name: "achievements", });

    const watchedDrill = useWatch({ control, name: "drillRows" });
    const totals = watchedDrill?.slice(0, 3).reduce(
        (acc, row) => ({
            maxMks: acc.maxMks + Number(row.maxMks || 0),
            m1: acc.m1 + Number(row.m1 || 0),
            m2: acc.m2 + Number(row.m2 || 0),
            a1c1: acc.a1c1 + Number(row.a1c1 || 0),
            a2c2: acc.a2c2 + Number(row.a2c2 || 0),
        }),
        { maxMks: 0, m1: 0, m2: 0, a1c1: 0, a2c2: 0 }
    );

    useEffect(() => {
        if (!watchedDrill || watchedDrill.length < 4) return;

        const current = watchedDrill[3];

        const shouldUpdate =
            current.m1 !== totals.m1 ||
            current.m2 !== totals.m2 ||
            current.a1c1 !== totals.a1c1 ||
            current.a2c2 !== totals.a2c2 ||
            current.maxMks !== totals.maxMks;

        if (!shouldUpdate) return;

        setValue("drillRows.3", {
            ...current,
            maxMks: totals.maxMks,
            m1: totals.m1,
            m2: totals.m2,
            a1c1: totals.a1c1,
            a2c2: totals.a2c2,
        });
    }, [watchedDrill]);

    const toNumberOrEmpty = (v: any): number | "" => {
        if (v === null || v === undefined || v === "") return "";
        const num = Number(v);
        return isNaN(num) ? "" : num;
    };

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

    const onSubmitDrill = async () => {
        try {
            const values = getValues();
            if (!selectedCadet) throw new Error("No cadet selected");
            const drillRows = [...values.drillRows];
            drillRows[3] = { ...drillRows[3], ...totals };
            const rowsToSave = drillRows.slice(0, 3);

            for (const [index, row] of rowsToSave.entries()) {
                const body = {
                    semester: romanToNumber[row.semester],
                    maxMarks: Number(row.maxMks),
                    m1Marks: Number(row.m1),
                    m2Marks: Number(row.m2),
                    a1c1Marks: Number(row.a1c1),
                    a2c2Marks: Number(row.a2c2),
                    remark: row.remarks?.trim() || "",
                };

                if (row.id) {
                    await updateOcDrill(selectedCadet.ocId, row.id, body);
                } else {
                    const created = await createOcDrill(selectedCadet.ocId, body);
                    row.id = created.id;
                    setValue(`drillRows.${index}.id`, created.id);
                }
            }

            toast.success("Drill records saved successfully");

            setSavedData(prev => ({
                ...prev,
                drillRows: drillRows
            }));
            setDrillSaved(true);

        } catch (error) {
            console.error("Failed to save drill records:", error);
            toast.error("Failed to save drill details");
        }
    };

    async function loadDrillData() {
        if (!selectedCadet?.ocId) return;

        try {
            const res = await listOcDrill(selectedCadet.ocId, 50, 0);
            const items = res?.items ?? [];

            let mapped: DrillRow[] = defaultDrillRows.map(row => {
                const apiRow = items.find(
                    x => x.semester === romanToNumber[row.semester]
                );

                return {
                    id: apiRow?.id || null,
                    semester: row.semester,
                    maxMks: apiRow ? toNumberOrEmpty(apiRow.maxMarks) : "",
                    m1: apiRow ? toNumberOrEmpty(apiRow.m1Marks) : "",
                    m2: apiRow ? toNumberOrEmpty(apiRow.m2Marks) : "",
                    a1c1: apiRow ? toNumberOrEmpty(apiRow.a1c1Marks) : "",
                    a2c2: apiRow ? toNumberOrEmpty(apiRow.a2c2Marks) : "",
                    remarks: apiRow?.remark ?? "",
                };
            });

            const backendTotals = mapped.slice(0, 3).reduce(
                (acc, row) => ({
                    maxMks: acc.maxMks + Number(row.maxMks || 0),
                    m1: acc.m1 + Number(row.m1 || 0),
                    m2: acc.m2 + Number(row.m2 || 0),
                    a1c1: acc.a1c1 + Number(row.a1c1 || 0),
                    a2c2: acc.a2c2 + Number(row.a2c2 || 0),
                }),
                { maxMks: 0, m1: 0, m2: 0, a1c1: 0, a2c2: 0 }
            );

            mapped[3] = {
                ...mapped[3],
                maxMks: backendTotals.maxMks,
                m1: backendTotals.m1,
                m2: backendTotals.m2,
                a1c1: backendTotals.a1c1,
                a2c2: backendTotals.a2c2,
            };
            setValue("drillRows", mapped);
            setTimeout(() => trigger("drillRows"), 0);
            setSavedData(prev => ({ ...prev, drillRows: mapped }));
            setDrillSaved(true);

        } catch (err) {
            console.error("Failed to fetch drill data:", err);
        }
    }

    useEffect(() => {
        loadDrillData();
    }, [selectedCadet, setValue]);

    const onSubmitAchievements = async () => {
        try {
            if (!selectedCadet) throw new Error("No cadet selected");

            const values = getValues();
            const rows = values.achievements;

            for (const [i, row] of rows.entries()) {
                const trimmed = row.achievement.trim();

                if (!trimmed) {
                    if (row.id) await deleteOcAchievement(selectedCadet.ocId, row.id);
                    continue;
                }

                if (row.id) {
                    await updateOcAchievement(selectedCadet.ocId, row.id, { achievement: trimmed });
                } else {
                    const created = await createOcAchievement(selectedCadet.ocId, { achievement: trimmed });
                    setValue(`achievements.${i}.id`, created.id);
                }
            }

            toast.success("Achievements updated");

            setSavedData(prev => ({
                ...prev,
                achievements: rows
            }));

            setAchSaved(true);

        } catch (err) {
            console.error(err);
            toast.error("Failed to save achievements");
        }
    };

    async function loadAchievements() {
        if (!selectedCadet?.ocId) return;

        try {
            const res = await listOcAchievements(selectedCadet.ocId);
            const items = res.items ?? [];

            const mapped = items.map(a => ({
                id: a.id,
                achievement: a.achievement || ""
            }));
            setValue("achievements", mapped.length ? mapped : [{ id: null, achievement: "" }]);
            setSavedData(prev => ({
                ...prev,
                achievements: mapped
            }));

            setAchSaved(true);

        } catch (error) {
            console.error("Failed to fetch achievements:", error);
        }
    }
    useEffect(() => {
        loadAchievements();
    }, [selectedCadet]);

    const onResetClub = () => {
        reset({ ...getValues(), clubRows: defaultClubRows });
    };

    const onResetDrill = () => {
        reset({ ...getValues(), drillRows: defaultDrillRows });
    };
    const onResetAchievements = () => {
        reset({
            ...getValues(),
            achievements: [{ id: null, achievement: "" }],
        });
    };

    const onResetAll = () => {
        reset({
            clubRows: defaultClubRows,
            drillRows: defaultDrillRows,
            achievements: [{ id: null, achievement: "" }]
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
                                {achSaved ? (
                                    <div>
                                        <h2 className="font-bold text-primary mb-2">Saved Achievements</h2>
                                        <AchievementsForm
                                            register={register}
                                            fields={achievementFields}
                                            append={addAchievement}
                                            remove={removeAchievement}
                                            disabled={true}
                                        />

                                        <div className="flex justify-center items-center">
                                            <Button
                                                onClick={() => setAchSaved(false)}
                                                className="mt-4 bg-blue-600 text-white"
                                            >
                                                Edit Achievements
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <AchievementsForm
                                        register={register}
                                        fields={achievementFields}
                                        append={addAchievement}
                                        remove={removeAchievement}
                                        onDeleteRow={async (i) => {
                                            const row = getValues().achievements[i];

                                            console.log("Deleting backend ID:", row.id);

                                            if (row?.id) {
                                                await deleteOcAchievement(selectedCadet!.ocId, row.id);
                                                toast.success("Deleted");
                                            }
                                            removeAchievement(i);
                                        }}
                                        onSubmit={handleSubmit(onSubmitAchievements)}
                                        onReset={() => reset({ ...getValues(), achievements: [] })}
                                        disabled={false}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}
