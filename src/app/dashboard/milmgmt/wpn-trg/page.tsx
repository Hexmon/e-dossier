"use client";

import { useState, useEffect } from "react";
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
import { createSpecialAchievementInFiring, listSpecialAchievementsInFiring, SpecialAchievementInFiringRecord } from "@/app/lib/api/specialAchievementInFiringApi";
import { createWeaponTraining, deleteWeaponTraining, listWeaponTraining, updateWeaponTraining, WeaponTrainingRecord, WeaponTrainingUpdate } from "@/app/lib/api/weaponTrainingApi";
import { Semester } from "@/app/lib/oc-validators";

// ─────────────── TYPES ───────────────
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
    const [activeTab, setActiveTab] = useState(0);

    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);
    const ocId = selectedCadet?.ocId;   // your OC ID

    const [weaponTrainingRecords, setWeaponTrainingRecords] = useState<WeaponTrainingRecord[]>([]);
    const [achievementRecords, setAchievementRecords] = useState<SpecialAchievementInFiringRecord[]>([]);

    useEffect(() => {
        if (!ocId) return;

        const fetchData = async () => {
            try {
                const wpn = await listWeaponTraining(ocId);
                setWeaponTrainingRecords(wpn.items);

                const ach = await listSpecialAchievementsInFiring(ocId);
                setAchievementRecords(ach.items);
            } catch (err) {
                toast.error("Failed to load weapon training data");
            }
        };

        fetchData();
    }, [ocId]);

    const handleUpdateWeaponTraining = async (recordId: string, payload: WeaponTrainingUpdate) => {
        try {
            await updateWeaponTraining(ocId!, recordId, payload);

            setWeaponTrainingRecords(prev =>
                prev.map(r => (r.id === recordId ? { ...r, ...payload } : r))
            );

            toast.success("Weapon Training updated");
        } catch (err) {
            toast.error("Failed to update weapon training");
        }
    };

    const handleDeleteWeaponTraining = async (recordId: string) => {
        try {
            await deleteWeaponTraining(ocId!, recordId);

            setWeaponTrainingRecords(prev => prev.filter(r => r.id !== recordId));

            toast.success("Weapon Training deleted");
        } catch (err) {
            toast.error("Failed to delete");
        }
    };

    const [savedData, setSavedData] = useState<TermData[]>(
        terms.map(() => ({
            records: [],
            achievements: [],
        }))
    );

    // ─────────────── FORM SETUP ───────────────
    const { register, handleSubmit, reset, control, setValue } = useForm<TermData>({
        defaultValues: {
            records: termPrefill,
            achievements: achievementPrefill,
        },
    });

    const watchedRecords = useWatch({ control, name: "records" });

    // ─────────────── AUTO TOTAL CALCULATION ───────────────
    const totalMarks = watchedRecords?.reduce(
        (sum, r) => sum + (parseFloat(r.obtained) || 0),
        0
    );

    useEffect(() => {
        setValue("records", [
            ...(watchedRecords || []),
            { subject: "Total", maxMarks: 120, obtained: totalMarks.toString() },
        ]);
    }, []);

    // ─────────────── SUBMIT ───────────────
    const onSubmit = async (formData: TermData) => {
        if (!selectedCadet?.ocId) {
            toast.error("Cadet not selected");
            return;
        }

        try {
            // ---------------------------
            // 1. CREATE WEAPON TRAINING
            // ---------------------------
            const wpnPayload = formData.records.slice(0, 3).map(r => ({
                subject: r.subject,
                semester: activeTab + 3,
                maxMarks: r.maxMarks,
                marksObtained: Number(r.obtained) || 0,

            }));

            for (const payload of wpnPayload) {
                await createWeaponTraining(selectedCadet?.ocId, payload);
            }

            toast.success("Weapon Training saved!");

            // ---------------------------
            // 2. CREATE SPECIAL ACHIEVEMENTS
            // ---------------------------
            for (const ach of formData.achievements) {
                if (ach.trim().length === 0) continue;

                await createSpecialAchievementInFiring(selectedCadet.ocId, {
                    achievement: ach,
                });
            }

            toast.success("Achievements saved!");

        } catch (err) {
            toast.error("Failed to save data");
        }
    };

    // ─────────────── RENDER TABLE ───────────────
    const renderTable = () => (
        <div className="overflow-x-auto border rounded-lg shadow">
            <table className="w-full border text-sm">
                <thead className="bg-gray-100 text-left">
                    <tr>
                        <th className="p-2 border">No</th>
                        <th className="p-2 border">Subject</th>
                        <th className="p-2 border">Max Marks</th>
                        <th className="p-2 border">Marks Obtained</th>
                    </tr>
                </thead>
                <tbody>
                    {termPrefill.map((row, index) => (
                        <tr key={index}>
                            <td className="p-2 border text-center">{index + 1}</td>
                            <td className="p-2 border">{row.subject}</td>
                            <td className="p-2 border text-center">{row.maxMarks}</td>
                            <td className="p-2 border">
                                <Input
                                    {...register(`records.${index}.obtained` as const)}
                                    type="number"
                                    placeholder="Enter Marks"
                                    className="w-full"
                                />
                            </td>
                        </tr>
                    ))}
                    <tr className="font-semibold bg-gray-50">
                        <td className="p-2 border text-center">4</td>
                        <td className="p-2 border">Total</td>
                        <td className="p-2 border text-center">120</td>
                        <td className="p-2 border text-center">{totalMarks}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );

    // ─────────────── RENDER SAVED TABLE ───────────────
    const renderSaved = () => {
        const termData = savedData[activeTab];
        if (termData.records.length === 0)
            return (
                <p className="text-center text-gray-500 border rounded-lg p-4">
                    No data submitted yet for this term.
                </p>
            );

        return (
            <table className="w-full border text-sm mt-4 rounded-lg overflow-hidden">
                <thead className="bg-gray-200">
                    <tr>
                        <th className="p-2 border">No</th>
                        <th className="p-2 border">Subject</th>
                        <th className="p-2 border">Max Marks</th>
                        <th className="p-2 border">Obtained</th>
                    </tr>
                </thead>
                <tbody>
                    {termData.records.map((r, i) => (
                        <tr key={i}>
                            <td className="p-2 border text-center">{i + 1}</td>
                            <td className="p-2 border">{r.subject}</td>
                            <td className="p-2 border text-center">{r.maxMarks}</td>
                            <td className="p-2 border text-center">{r.obtained || "-"}</td>
                        </tr>
                    ))}
                    <tr className="font-semibold bg-gray-50">
                        <td className="p-2 border text-center">4</td>
                        <td className="p-2 border">Total</td>
                        <td className="p-2 border text-center">120</td>
                        <td className="p-2 border text-center">
                            {termData.records.reduce(
                                (sum, r) => sum + (parseFloat(r.obtained) || 0),
                                0
                            )}
                        </td>
                    </tr>
                </tbody>
            </table>
        );
    };

    // ─────────────── MAIN RENDER ───────────────
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

                    <TabsContent value="wpn-trg" className="space-y-6">
                        <Card className="max-w-5xl mx-auto p-6 rounded-2xl shadow-xl bg-white">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-center text-primary">
                                    WEAPON TRAINING (WPN TRG)
                                </CardTitle>
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
                                                reset({ records: termPrefill, achievements: achievementPrefill });
                                            }}
                                            className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === index
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-200 text-gray-700"
                                                }`}
                                        >
                                            {term}
                                        </button>
                                    ))}
                                </div>

                                {/* Saved Table */}
                                <div className="mb-6">{renderSaved()}</div>

                                {/* Form */}
                                <form onSubmit={handleSubmit(onSubmit)}>
                                    {renderTable()}

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
                                    <div className="mt-6">
                                        <h2 className="font-semibold underline mb-2">
                                            Special Achievements in Firing
                                        </h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {achievementPrefill.map((_, i) => (
                                                <Input
                                                    key={i}
                                                    {...register(`achievements.${i}` as const)}
                                                    placeholder={`Achievement ${i + 1}`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Special Achievement Info */}
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

                                    <div className="flex justify-center gap-3 mt-6">
                                        <Button type="submit" className="bg-green-600 hover:bg-green-700">
                                            Save
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                reset({ records: termPrefill, achievements: achievementPrefill })
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