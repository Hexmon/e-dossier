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
import { Shield, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import ObstacleTrainingForm from "@/components/obstacle/ObstacleTrainingForm";
import { obstaclePrefill, terms } from "@/constants/app.constants";
import { useOcDetails } from "@/hooks/useOcDetails";
import { useObstacleTraining } from "@/hooks/useObstacleTraining";
import { Button } from "@/components/ui/button";
import type { TermData } from "@/types/obstacleTrg";
import type { RootState } from "@/store";
import { saveObstacleTrainingForm, clearObstacleTrainingForm } from "@/store/slices/obstacleTrainingSlice";

export default function ObstacleTrgPage() {
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

    const semesterApiBase = 4; // IV -> 4
    const semParam = searchParams.get("semester");
    const resolvedTab = useMemo(() => {
        const parsed = Number(semParam);
        if (!Number.isFinite(parsed)) return 0;
        const idx = parsed - semesterApiBase;
        if (idx < 0 || idx >= terms.length) return 0;
        return idx;
    }, [semParam]);
    const [activeTab, setActiveTab] = useState<number>(resolvedTab);
    const semesterNumber = activeTab + semesterApiBase;

    // Redux
    const dispatch = useDispatch();
    const savedFormData = useSelector((state: RootState) =>
        state.obstacleTraining.forms[ocId]?.[semesterNumber]
    );

    // Ref to track last saved data for auto-save optimization
    const lastSavedData = useRef<string>("");

    const { records, loading, loadAll, saveRecords } = useObstacleTraining(ocId);

    const [isEditingAll, setIsEditingAll] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setActiveTab(resolvedTab);
    }, [resolvedTab]);

    const updateSemesterParam = (index: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("semester", String(index + semesterApiBase));
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

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
        const savedForSem = (records ?? []).filter((r) => Number(r.semester ?? 0) === Number(semesterNumber));

        if (savedForSem.length > 0) {
            console.log('Using database data');
            const mergedRecords = obstaclePrefill.map((p) => {
                const latest = [...savedForSem].reverse().find((s) => (s.obstacle ?? "") === (p.obstacle ?? ""));
                return {
                    id: latest?.id ?? p.id,
                    obstacle: p.obstacle ?? "-",
                    obtained: latest ? String(latest.marksObtained ?? "") : String(p.obtained ?? ""),
                    remark: latest ? String(latest.remark ?? "") : String(p.remark ?? ""),
                };
            });

            return { records: mergedRecords };
        }

        // Finally use prefill
        console.log('Using prefill data');
        return { records: obstaclePrefill };
    }, [savedFormData, records, semesterNumber]);

    const formMethods = useForm<TermData>({
        mode: "onChange",
        defaultValues: getDefaultValues()
    });

    const { reset, watch } = formMethods;

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
                };

                // Compare stringified data to avoid unnecessary dispatches
                const currentData = JSON.stringify(formData);
                if (currentData !== lastSavedData.current) {
                    console.log('Auto-saving to Redux:', formData);
                    lastSavedData.current = currentData;
                    dispatch(saveObstacleTrainingForm({
                        ocId,
                        semester: semesterNumber,
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
    }, [watch, dispatch, ocId, semesterNumber]);

    // Update lastSavedData when activeTab changes
    useEffect(() => {
        const defaultVals = getDefaultValues();
        lastSavedData.current = JSON.stringify(defaultVals);
    }, [activeTab]);

    const handleSaveTerm = useCallback(
        async (formData: TermData) => {
            if (!ocId) {
                toast.error("No cadet selected");
                return;
            }
            const payloads = formData.records.slice(0, obstaclePrefill.length).map((r) => {
                const { id, obstacle = "", obtained = "", remark = "" } = r;
                return {
                    id,
                    semester: semesterNumber,
                    obstacle: obstacle ?? "",
                    marksObtained: Number(obtained ?? 0),
                    remark: remark ?? undefined,
                };
            });

            setIsSaving(true);
            try {
                const ok = await saveRecords(payloads);
                if (!ok) throw new Error("save failed");

                toast.success("Obstacle training saved successfully");
                await loadAll();

                // Clear Redux cache for this semester after successful save
                dispatch(clearObstacleTrainingForm({ ocId, semester: semesterNumber }));
                setIsEditingAll(false);
            } catch (err) {
                console.error(err);
                toast.error("Failed to save obstacle training");
            } finally {
                setIsSaving(false);
            }
        },
        [ocId, saveRecords, semesterNumber, loadAll, dispatch]
    );

    const handleCancel = async () => {
        // Clear Redux cache and reload from database
        dispatch(clearObstacleTrainingForm({ ocId, semester: semesterNumber }));
        await loadAll();
        setIsEditingAll(false);
    };

    const handleTabChange = (index: number) => {
        setActiveTab(index);
        updateSemesterParam(index);
        setIsEditingAll(false);
    };

    return (
        <DashboardLayout title="Assessment: Obstacle Training" description="Record of obstacle training performance and remarks.">
            <main className="p-6">
                <BreadcrumbNav paths={[{ label: "Dashboard", href: "/dashboard" }, { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` }, { label: "Obstacle Training" }]} />

                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                <DossierTab tabs={dossierTabs} defaultValue="obstacle-trg" ocId={ocId} extraTabs={
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2">
                                <Shield className="h-4 w-4" /> Mil-Trg <ChevronDown className="h-4 w-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                            {militaryTrainingCards.map(({ title, icon: Icon, color, to }) => {
                                const link = to(ocId);
                                return (
                                    <DropdownMenuItem key={title} asChild>
                                        <Link href={link} className="flex items-center gap-2">
                                            <Icon className={`h-4 w-4 ${color}`} />
                                            {title}
                                        </Link>
                                    </DropdownMenuItem>
                                );
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                }>
                    <TabsContent value="obstacle-trg">
                        <Card className="max-w-5xl mx-auto p-6 rounded-2xl shadow-xl bg-white">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-center text-primary">OBSTACLE TRAINING</CardTitle>
                            </CardHeader>

                            <CardContent>
                                {/* Term Tabs */}
                                <div className="flex justify-center mb-6 space-x-2">
                                    {terms.map((term, idx) => {
                                        return (
                                            <button
                                                key={term}
                                                type="button"
                                                onClick={() => handleTabChange(idx)}
                                                className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === idx ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
                                            >
                                                {term}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Form component */}
                                <ObstacleTrainingForm
                                    semesterNumber={semesterNumber}
                                    onSave={handleSaveTerm}
                                    isEditing={isEditingAll}
                                    onCancelEdit={handleCancel}
                                    formMethods={formMethods}
                                    isSaving={isSaving}
                                />

                                {/* Edit / Save toggle */}
                                <div className="flex justify-center mb-4">
                                    {!isEditingAll ? (
                                        <Button type="button" onClick={() => setIsEditingAll(true)} disabled={isSaving}>
                                            Edit
                                        </Button>
                                    ) : null}
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
