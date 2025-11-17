"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DossierTab from "@/components/Tabs/DossierTab";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { ChevronDown, Shield } from "lucide-react";
import { toast } from "sonner";


import {
    createSpecialAchievementInFiring,
    listSpecialAchievementsInFiring,
    SpecialAchievementInFiringRecord,
    updateSpecialAchievementInFiring,
} from "@/app/lib/api/specialAchievementInFiringApi";

import {
    createWeaponTraining,
    deleteWeaponTraining,
    listWeaponTraining,
    updateWeaponTraining,
    WeaponTrainingRecord,
    WeaponTrainingUpdate,
} from "@/app/lib/api/weaponTrainingApi";
import WeaponTrainingTable, { TableRow } from "@/components/wpnTrg/WeaponTrainingTable";

/**
 * Page-level types for form
 */
interface Row {
    subject: string;
    maxMarks: number;
    obtained: string;
}

interface TermData {
    records: Row[];
    achievements: string[];
}

const termPrefill: Row[] = [
    { subject: "Written", maxMarks: 40, obtained: "" },
    { subject: "5.56 MM INSAS Firing", maxMarks: 40, obtained: "" },
    { subject: "5.56 MM INSAS LMG Firing", maxMarks: 40, obtained: "" },
];

const achievementPrefill = ["", "", "", "", "", ""];

export default function WpnTrgPage() {
    const terms = ["III TERM", "IV TERM", "V TERM", "VI TERM"];
    const [activeTab, setActiveTab] = useState<number>(0);

    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);
    const ocId = selectedCadet?.ocId;

    const [weaponTrainingRecords, setWeaponTrainingRecords] = useState<WeaponTrainingRecord[]>([]);
    const [achievementRecords, setAchievementRecords] = useState<SpecialAchievementInFiringRecord[]>([]);
    const [isEditingAchievements, setIsEditingAchievements] = useState(false);

    const { register, handleSubmit, reset, control, setValue, watch } = useForm<TermData>({
        defaultValues: {
            records: termPrefill,
            achievements: achievementPrefill,
        },
    });

    useEffect(() => {
        if (!ocId) return;

        const fetch = async () => {
            try {
                const wpn = await listWeaponTraining(ocId);
                setWeaponTrainingRecords(wpn.items || []);

                const ach = await listSpecialAchievementsInFiring(ocId);
                setAchievementRecords(ach.items || []);

                const filled = (ach.items || []).map(a => a.achievement);
                const padded = filled.concat(
                    Array(achievementPrefill.length - filled.length).fill("")
                );

                reset({
                    records: termPrefill,
                    achievements: padded,
                });

                setIsEditingAchievements(false);

            } catch (err) {
                toast.error("Failed to load weapon training data");
            }
        };

        fetch();
    }, [ocId, reset]);


    const handleUpdateWeaponTraining = async (recordId: string, payload: WeaponTrainingUpdate) => {
        try {
            await updateWeaponTraining(ocId!, recordId, payload);
            setWeaponTrainingRecords(prev => prev.map(r => (r.id === recordId ? { ...r, ...payload } : r)));
            toast.success("Weapon Training updated");
        } catch (err) {
            toast.error("Failed to update weapon training");
            console.error(err);
        }
    };

    const handleDeleteWeaponTraining = async (recordId: string) => {
        try {
            await deleteWeaponTraining(ocId!, recordId);
            setWeaponTrainingRecords(prev => prev.filter(r => r.id !== recordId));
            toast.success("Weapon Training deleted");
        } catch (err) {
            toast.error("Failed to delete");
            console.error(err);
        }
    };

    const watchedRecords = useWatch({ control, name: "records" });
    const totalMarks = useMemo(
        () => (watchedRecords || []).slice(0, 3).reduce((s, r) => s + (parseFloat(r.obtained) || 0), 0),
        [watchedRecords]
    );
    const apiTermNumber = activeTab + 3;
    const savedRowsForTerm: TableRow[] = useMemo(() => {
        return weaponTrainingRecords
            .filter((r) => r.semester === apiTermNumber)
            .map((r) => ({
                id: r.id,
                subject: r.subject,
                maxMarks: r.maxMarks,
                obtained: String(r.marksObtained ?? ""),
            }));
    }, [weaponTrainingRecords, apiTermNumber]);

    const savedAchievementsForTerm = achievementRecords;

    const onSubmitWeaponTraining = async (formData: TermData) => {
        try {
            const payloads = formData.records.slice(0, 3).map((r) => ({
                subject: r.subject,
                semester: apiTermNumber,
                maxMarks: r.maxMarks,
                marksObtained: Number(r.obtained) || 0,
            }));

            for (const p of payloads) {
                await createWeaponTraining(ocId!, p);
            }

            toast.success("Weapon Training saved!");

            const refreshed = await listWeaponTraining(ocId!);
            setWeaponTrainingRecords(refreshed.items || []);

        } catch (err) {
            toast.error("Failed to save weapon training");
        }
    };


    const onSubmitAchievements = async (formData: TermData) => {
        try {
            const existing = achievementRecords;
            const formList = formData.achievements.filter(a => a.trim().length !== 0);

            // update existing
            for (let i = 0; i < existing.length; i++) {
                await updateSpecialAchievementInFiring(ocId!, existing[i].id, {
                    achievement: formList[i] || "",
                });
            }

            // create new
            for (let i = existing.length; i < formList.length; i++) {
                await createSpecialAchievementInFiring(ocId!, {
                    achievement: formList[i],
                });
            }

            toast.success("Achievements updated!");

            const refreshed = await listSpecialAchievementsInFiring(ocId!);
            setAchievementRecords(refreshed.items || []);
            setIsEditingAchievements(false);

        } catch (err) {
            toast.error("Failed to update achievements");
        }
    };

    const handleEditSave = async (updated: { id: string; subject: string; maxMarks: number; marksObtained: number }) => {
        if (!ocId) return;
        await handleUpdateWeaponTraining(updated.id, {
            subject: updated.subject,
            maxMarks: updated.maxMarks,
            marksObtained: updated.marksObtained,
        });
    };

    const handleDelete = async (id: string) => {
        if (!ocId) return;
        await handleDeleteWeaponTraining(id);
    };

    return (
        <DashboardLayout
            title="Assessment: Weapon Training (WPN TRG)"
            description="Record of marks and special achievements in firing."
        >
            <main className="p-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: "/dashboard/milmgmt" },
                        { label: "Weapon Training" },
                    ]}
                />

                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="wpn-trg"
                    extraTabs={
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <TabsTrigger value="miltrg" className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" /> Mil-Trg
                                    <ChevronDown className="h-4 w-4" />
                                </TabsTrigger>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                                {militaryTrainingCards.map((card) => (
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
                    <TabsContent value="wpn-trg" className="space-y-6">
                        <Card className="max-w-5xl mx-auto p-6 rounded-2xl shadow-xl bg-white">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-center text-primary">WEAPON TRAINING (WPN TRG)</CardTitle>
                            </CardHeader>

                            <CardContent>
                                {/* Term Tabs */}
                                <div className="flex justify-center mb-6 space-x-2">
                                    {terms.map((term, index) => (
                                        <button
                                            key={term}
                                            type="button"
                                            onClick={() => {
                                                setActiveTab(index);
                                                // reset inputs when switching term
                                                reset({ records: termPrefill, achievements: achievementPrefill });
                                            }}
                                            className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === index ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
                                        >
                                            {term}
                                        </button>
                                    ))}
                                </div>

                                {/* Weapon Training Table */}

                                <form onSubmit={handleSubmit(onSubmitWeaponTraining)}>
                                    <WeaponTrainingTable
                                        title={`Weapon Training - ${terms[activeTab]}`}
                                        savedRows={savedRowsForTerm}
                                        inputRows={termPrefill}
                                        register={register}
                                        total={totalMarks}
                                        onDelete={handleDelete}
                                        onEditSave={handleEditSave}
                                    />

                                    <div className="flex justify-center gap-3 mt-6">
                                        <Button type="submit" className="bg-green-600 hover:bg-green-700">
                                            Save Weapon Training
                                        </Button>
                                    </div>
                                </form>


                                {/* Firing Standard */}
                                <div className="mt-6 border rounded-lg p-4 bg-gray-50 flex justify-center">
                                    <div>
                                        <div className="flex justify-center">
                                            <h2 className="font-semibold underline mb-2">FIRING STD</h2>
                                        </div>
                                        <p className="text-sm leading-relaxed">
                                            <b>HPS:</b> 100% — MM: 75% and above, FC: 50% to 74%, SS: 30% to 49%, FAIL: Below 30%
                                        </p>
                                    </div>
                                </div>

                                {/* Achievements */}
                                <form onSubmit={handleSubmit(onSubmitAchievements)}>
                                    <div className="mt-6">
                                        <h2 className="font-semibold underline mb-2">Special Achievements in Firing</h2>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {(watch("achievements") || []).map((_, i) => (
                                                <Input
                                                    key={i}
                                                    disabled={!isEditingAchievements}
                                                    {...register(`achievements.${i}` as const)}
                                                    placeholder={`Achievement ${i + 1}`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Info Section */}
                                    <div className="mt-6 border rounded-lg p-4 bg-gray-50 flex justify-center">
                                        <div>
                                            <div className="flex justify-center">
                                                <h2 className="font-semibold underline mb-2">Special Achievement Like</h2>
                                            </div>
                                            <p className="text-sm leading-relaxed">
                                                Best in WT, Best Firer, Participation in National Games (if applicable)
                                            </p>
                                        </div>
                                    </div>

                                    {/* SINGLE BUTTON BELOW THE SECTION */}
                                    <div className="flex justify-center gap-3 mt-6">
                                        <Button
                                            type="submit"
                                            className={isEditingAchievements ? "bg-green-600 text-white" : "bg-blue-600 text-white"}
                                            onClick={(e) => {
                                                if (!isEditingAchievements) {
                                                    e.preventDefault();  // prevent accidental save
                                                    setIsEditingAchievements(true);
                                                }
                                            }}
                                        >
                                            {isEditingAchievements ? "Save" : "Edit"}
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
