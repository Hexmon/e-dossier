"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Shield, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import WeaponTrainingForm from "@/components/wpnTrg/WeaponTrainingForm";
import AchievementsForm from "@/components/wpnTrg/AchievementsForm";
import { useOcPersonal } from "@/hooks/useOcPersonal";
import { useWeaponTraining } from "@/hooks/useWeaponTraining";

import type { WeaponTrainingRecord } from "@/app/lib/api/weaponTrainingApi";
import { termPrefill } from "@/types/wpn-trg";
import { useOcDetails } from "@/hooks/useOcDetails";
import Link from "next/link";

export default function WpnTrgPage() {
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";

    const { cadet } = useOcDetails(ocId);
    const {
        name = "",
        courseName = "",
        ocNumber = "",
        ocId: cadetOcId = ocId,
        course = "",
    } = cadet ?? {};

    const selectedCadet = useMemo(() => ({ name, courseName, ocNumber, ocId: cadetOcId, course }), [name, courseName, ocNumber, cadetOcId, course]);

    const terms = useMemo(() => ["III TERM", "IV TERM", "V TERM", "VI TERM"], []);
    const [activeTab, setActiveTab] = useState<number>(0);
    const semesterApiNumber = activeTab + 3;

    const {
        weaponRecords,
        achievements,
        loading,
        loadAll,
        saveWeaponRecords,
        saveAchievements,
        deleteAchievement,
    } = useWeaponTraining(ocId);

    useEffect(() => {
        if (!ocId) return;
        loadAll();
    }, [ocId, loadAll]);

    const weaponFormMethods = useForm({
        defaultValues: { records: termPrefill },
    });

    const onSaveWeapon = useCallback(
        async (data: { records: { maxMarks: number; obtained: string }[] }) => {
            try {
                const payloads = termPrefill.map((pref, idx) => {
                    const formRow = data.records[idx] ?? { obtained: "" };
                    const existing = weaponRecords.find((r: WeaponTrainingRecord) => r.semester === semesterApiNumber && r.subject === pref.subject);
                    return {
                        id: existing?.id,
                        subject: pref.subject,
                        semester: semesterApiNumber,
                        maxMarks: Number(formRow.maxMarks ?? pref.maxMarks ?? 0),
                        marksObtained: Number(formRow.obtained ?? 0),
                    };
                });

                const ok = await saveWeaponRecords(payloads);
                if (!ok) throw new Error("save failed");
            } catch (err) {
                console.error(err);
                toast.error("Failed to save weapon training");
            }
        },
        [weaponRecords, semesterApiNumber, saveWeaponRecords]
    );

    const onSaveAchievements = useCallback(
        async (list: { achievement: string }[]) => {
            const cleaned = list.map((l) => ({ achievement: l.achievement ?? "" })).filter((l) => l.achievement.trim() !== "");
            await saveAchievements(cleaned);
        },
        [saveAchievements]
    );

    return (
        <DashboardLayout title="Weapon Training (WPN TRG)" description="Marks and achievements">
            <main className="p-6">
                <BreadcrumbNav paths={[{ label: "Dashboard", href: "/dashboard" }, { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` }, { label: "Weapon Training" }]} />

                {cadet && <div className="hidden md:flex sticky top-16 z-40 mb-6"><SelectedCadetTable selectedCadet={selectedCadet} /></div>}

                <DossierTab tabs={dossierTabs} defaultValue="wpn-trg" ocId={ocId} extraTabs={
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2"><Shield className="h-4 w-4" /> Mil-Trg</button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                            {militaryTrainingCards.map((card) => {
                                const link = card.to(ocId);
                                return (
                                    <DropdownMenuItem key={card.title} asChild>
                                        <Link href={link} className="flex items-center gap-2"><card.icon className={`h-4 w-4 ${card.color}`} />{card.title}</Link>
                                    </DropdownMenuItem>
                                );
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                }>
                    <TabsContent value="wpn-trg">
                        <Card className="max-w-5xl mx-auto p-6 rounded-2xl shadow-xl bg-white">
                            <CardHeader><CardTitle className="text-lg font-semibold text-center text-primary">WEAPON TRAINING (WPN TRG)</CardTitle></CardHeader>

                            <CardContent>
                                <div className="flex justify-center mb-6 space-x-2">
                                    {terms.map((t, i) => {
                                        return (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => {
                                                    setActiveTab(i);
                                                    // reload server snapshot for this oc
                                                    loadAll();
                                                }}
                                                className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === i ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
                                            >
                                                {t}
                                            </button>
                                        );
                                    })}
                                </div>

                                <WeaponTrainingForm
                                    semesterNumber={semesterApiNumber}
                                    inputPrefill={termPrefill}
                                    savedRecords={weaponRecords}
                                    onSave={async (vals) => {
                                        await onSaveWeapon(vals);
                                        await loadAll();
                                    }}
                                    formMethods={weaponFormMethods}
                                />

                                <div className="mt-6">
                                    <AchievementsForm
                                        savedAchievements={achievements}
                                        onSave={onSaveAchievements}
                                        onDelete={async (id) => {
                                            await deleteAchievement(id);
                                            await loadAll();
                                        }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}