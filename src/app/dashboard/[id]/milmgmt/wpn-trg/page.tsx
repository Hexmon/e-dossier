"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Shield } from "lucide-react";
import { toast } from "sonner";

import WeaponTrainingForm from "@/components/wpnTrg/WeaponTrainingForm";
import AchievementsForm from "@/components/wpnTrg/AchievementsForm";
import { useOcDetails } from "@/hooks/useOcDetails";
import { useWeaponTraining } from "@/hooks/useWeaponTraining";

import type { WeaponTrainingRecord } from "@/app/lib/api/weaponTrainingApi";
import { termPrefill } from "@/types/wpn-trg";
import type { RootState } from "@/store";
import { saveWeaponTrainingForm, clearWeaponTrainingForm } from "@/store/slices/weaponTrainingSlice";
import Link from "next/link";
import { resolveTabStateClasses, resolveToneClasses } from "@/lib/theme-color";

export default function WpnTrgPage() {
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

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
    const semesterApiBase = 3;
    const semParam = searchParams.get("semester");
    const resolvedTab = useMemo(() => {
        const parsed = Number(semParam);
        if (!Number.isFinite(parsed)) return 0;
        const idx = parsed - semesterApiBase;
        if (idx < 0 || idx >= terms.length) return 0;
        return idx;
    }, [semParam, terms.length]);
    const [activeTab, setActiveTab] = useState<number>(resolvedTab);
    const semesterApiNumber = activeTab + semesterApiBase;

    // Redux
    const dispatch = useDispatch();
    const savedFormData = useSelector((state: RootState) =>
        state.weaponTraining.forms[ocId]?.[semesterApiNumber]
    );

    // Ref to track last saved data for auto-save optimization
    const lastSavedData = useRef<string>("");

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

    // Create stable default values - prioritize Redux cache over database
    const getDefaultValues = useCallback(() => {
        // First check Redux cache for this semester
        if (savedFormData) {
            console.log('Using Redux cache data');
            return savedFormData;
        }

        // Then check database
        const currentRecords = weaponRecords.filter(
            (r: WeaponTrainingRecord) => r.semester === semesterApiNumber
        );

        if (currentRecords.length > 0 || achievements.length > 0) {
            console.log('Using database data');
            const mergedRecords = termPrefill.map((pref) => {
                const match = currentRecords.find((r) => r.subject === pref.subject);
                return match
                    ? {
                        id: match.id,
                        subject: match.subject ?? pref.subject,
                        maxMarks: match.maxMarks ?? pref.maxMarks,
                        obtained: String(match.marksObtained ?? ""),
                    }
                    : pref;
            });

            return {
                records: mergedRecords,
                achievements: achievements.map((a) => ({
                    id: a.id,
                    achievement: a.achievement ?? "",
                })),
            };
        }

        // Finally use prefill
        console.log('Using prefill data');
        return {
            records: termPrefill,
            achievements: [{ achievement: "" }],
        };
    }, [savedFormData, weaponRecords, achievements, semesterApiNumber]);

    const weaponFormMethods = useForm({
        mode: "onChange",
        defaultValues: getDefaultValues(),
    });

    const { reset, watch, getValues } = weaponFormMethods;

    const [isSaving, setIsSaving] = useState(false);
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        setActiveTab(resolvedTab);
    }, [resolvedTab]);

    const updateSemesterParam = (index: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("semester", String(index + semesterApiBase));
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    // Reset form when activeTab changes
    useEffect(() => {
        const newValues = getDefaultValues();
        console.log('Resetting form with:', newValues);
        reset(newValues);
    }, [activeTab, reset, getDefaultValues]);

    // Auto-save to Redux on form changes with debouncing
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const subscription = watch((value) => {
            if (!ocId || !value.records) return;

            // Clear existing timeout
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            // Debounce the save operation
            timeoutId = setTimeout(() => {
                const formData = {
                    records: value.records as any[],
                    achievements: value.achievements as any[] || [{ achievement: "" }],
                };

                // Compare stringified data to avoid unnecessary dispatches
                const currentData = JSON.stringify(formData);
                if (currentData !== lastSavedData.current) {
                    console.log('Auto-saving to Redux:', formData);
                    lastSavedData.current = currentData;
                    dispatch(saveWeaponTrainingForm({
                        ocId,
                        semester: semesterApiNumber,
                        data: formData,
                    }));
                }
            }, 500);
        });

        return () => {
            subscription.unsubscribe();
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [watch, dispatch, ocId, semesterApiNumber]);

    // Update lastSavedData when activeTab changes
    useEffect(() => {
        const defaultVals = getDefaultValues();
        lastSavedData.current = JSON.stringify(defaultVals);
    }, [activeTab]);

    const onSaveWeapon = useCallback(
        async (data: { records: { maxMarks: number; obtained: string }[] }) => {
            try {
                setIsSaving(true);
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

                toast.success("Weapon training saved successfully");
                await loadAll();

                // Clear Redux cache for this semester after successful save
                dispatch(clearWeaponTrainingForm({ ocId, semester: semesterApiNumber }));
                setEditing(false);
            } catch (err) {
                console.error(err);
                toast.error("Failed to save weapon training");
            } finally {
                setIsSaving(false);
            }
        },
        [weaponRecords, semesterApiNumber, saveWeaponRecords, loadAll, dispatch, ocId]
    );

    const onSaveAchievements = useCallback(
        async (list: { achievement: string }[]) => {
            try {
                setIsSaving(true);
                const cleaned = list.map((l) => ({ achievement: l.achievement ?? "" })).filter((l) => l.achievement.trim() !== "");
                await saveAchievements(cleaned);
                toast.success("Achievements saved successfully");
                await loadAll();

                // Clear Redux cache for this semester after successful save
                dispatch(clearWeaponTrainingForm({ ocId, semester: semesterApiNumber }));
            } catch (err) {
                console.error(err);
                toast.error("Failed to save achievements");
            } finally {
                setIsSaving(false);
            }
        },
        [saveAchievements, loadAll, dispatch, ocId, semesterApiNumber]
    );

    const handleCancel = async () => {
        // Clear Redux cache and reload from database
        dispatch(clearWeaponTrainingForm({ ocId, semester: semesterApiNumber }));
        await loadAll();
        setEditing(false);
    };

    const handleReset = () => {
        const resetData = {
            records: termPrefill,
            achievements: [{ achievement: "" }],
        };

        reset(resetData);

        // Update Redux cache
        dispatch(saveWeaponTrainingForm({
            ocId,
            semester: semesterApiNumber,
            data: resetData,
        }));
    };

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
                                        <Link href={link} className="flex items-center gap-2"><card.icon className={`h-4 w-4 ${resolveToneClasses(card.color, "text")}`} />{card.title}</Link>
                                    </DropdownMenuItem>
                                );
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                }>
                    <TabsContent value="wpn-trg">
                        <Card className="max-w-5xl mx-auto p-6 rounded-2xl shadow-xl bg-card">
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
                                                    updateSemesterParam(i);
                                                    loadAll();
                                                }}
                                                className={`px-4 py-2 rounded-t-lg font-medium ${resolveTabStateClasses(activeTab === i)}`}
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
                                    onSave={onSaveWeapon}
                                    formMethods={weaponFormMethods}
                                    disabled={!editing}
                                    editing={editing}
                                    onEdit={() => setEditing(true)}
                                    onCancel={handleCancel}
                                    onReset={handleReset}
                                    isSaving={isSaving}
                                />

                                <div className="mt-6">
                                    <AchievementsForm
                                        savedAchievements={achievements}
                                        onSave={onSaveAchievements}
                                        onDelete={async (id) => {
                                            await deleteAchievement(id);
                                            await loadAll();
                                        }}
                                        disabled={!editing}
                                        control={weaponFormMethods.control}
                                        register={weaponFormMethods.register}
                                    />
                                </div>

                                {/* Auto-save indicator */}
                                <p className="text-sm text-muted-foreground text-center mt-4">
                                    * Changes are automatically saved to your browser
                                </p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}
