// app/(dashboard)/[id]/speed-march-runback/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "next/navigation";
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

import { tablePrefill, terms as termsConst, termColumns } from "@/constants/app.constants";
import { useOcDetails } from "@/hooks/useOcDetails";
import { Button } from "@/components/ui/button";
import { useSpeedMarch } from "@/hooks/useSpeedMarch";
import SpeedMarchForm from "@/components/speedMarch/SpeedMarchForm";
import type { RootState } from "@/store";
import { saveSpeedMarchForm, clearSpeedMarchForm } from "@/store/slices/speedMarchSlice";

type Row = {
    id?: string;
    test: string;
    timing10Label?: string;
    distance10?: string;
    timing20Label?: string;
    distance20?: string;
    timing30Label?: string;
    distance30?: string;
    marks?: string;
    remark?: string;
};

type TermData = {
    records: Row[];
};

export default function SpeedMarchPage() {
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

    const terms = useMemo(() => termsConst, []);
    const [activeTab, setActiveTab] = useState<number>(0);
    const semesterBase = 4; // IV -> 4
    const semesterNumber = activeTab + semesterBase;

    // Redux
    const dispatch = useDispatch();
    const savedFormData = useSelector((state: RootState) =>
        state.speedMarch.forms[ocId]?.[semesterNumber]
    );

    // Ref to track last saved data for auto-save optimization
    const lastSavedData = useRef<string>("");

    const { records, loading, loadAll, saveRecords, updateRecord, deleteRecord } = useSpeedMarch(ocId);

    const [isEditingAll, setIsEditingAll] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!ocId) return;
        void loadAll();
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
            const mergedRecords = tablePrefill.map((p) => {
                const {
                    id: prefId,
                    test: prefTest,
                    timing10Label: prefT10 = "",
                    distance10: prefD10 = "",
                    timing20Label: prefT20 = "",
                    distance20: prefD20 = "",
                    timing30Label: prefT30 = "",
                    distance30: prefD30 = "",
                    marks: prefMarks = "",
                    remark: prefRemark = "",
                } = p;
                const latest = [...savedForSem].slice().reverse().find((s) => (s.test ?? "") === (prefTest ?? ""));
                const id = latest?.id ?? prefId;
                const test = prefTest ?? "-";
                const timing10Label = prefT10 ?? "";
                const distance10 = latest && Number(latest.semester) === semesterNumber ? (latest.timings ?? "") : prefD10 ?? "";
                const timing20Label = prefT20 ?? "";
                const distance20 = latest && Number(latest.semester) === semesterNumber ? (latest.timings ?? "") : prefD20 ?? "";
                const timing30Label = prefT30 ?? "";
                const distance30 = latest && Number(latest.semester) === semesterNumber ? (latest.timings ?? "") : prefD30 ?? "";
                const marks = String(latest?.marks ?? prefMarks ?? "");
                const remark = String(latest?.remark ?? prefRemark ?? "");
                return {
                    id,
                    test,
                    timing10Label,
                    distance10,
                    timing20Label,
                    distance20,
                    timing30Label,
                    distance30,
                    marks,
                    remark,
                } as Row;
            });

            return { records: mergedRecords };
        }

        // Finally use prefill
        console.log('Using prefill data');
        return { records: tablePrefill };
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
                    dispatch(saveSpeedMarchForm({
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

            setIsSaving(true);
            try {
                const payloads = formData.records.slice(0, tablePrefill.length).map((r, idx) => {
                    const { id = undefined, test = "" } = r;

                    const distanceField = termColumns[activeTab]?.distance ?? "distance10";
                    const timingsRaw = (r as any)[distanceField];

                    const timings = timingsRaw !== undefined && timingsRaw !== null
                        ? String(timingsRaw).trim()
                        : "";

                    if (timings === "") {
                        return null;
                    }

                    const marks = Number(String(r.marks ?? tablePrefill[idx].marks ?? "0"));
                    const remark = r.remark ? String(r.remark).trim() : undefined;

                    return {
                        id,
                        semester: semesterNumber,
                        test,
                        timings,
                        marks,
                        remark,
                    };
                }).filter(Boolean);

                const cleanedPayloads = payloads.filter((p): p is NonNullable<typeof p> => p !== null);

                const ok = await saveRecords(
                    cleanedPayloads.map((p) => ({
                        id: p.id,
                        semester: p.semester,
                        test: p.test,
                        timings: p.timings,
                        marks: p.marks,
                        remark: p.remark,
                    }))
                );

                if (!ok) throw new Error("save failed");

                toast.success("Speed march saved successfully");
                await loadAll();

                // Clear Redux cache for this semester after successful save
                dispatch(clearSpeedMarchForm({ ocId, semester: semesterNumber }));
                setIsEditingAll(false);
            } catch (err) {
                console.error("handleSaveTerm", err);
                toast.error("Failed to save speed march");
            } finally {
                setIsSaving(false);
            }
        },
        [ocId, activeTab, semesterNumber, saveRecords, loadAll, dispatch]
    );

    const handleCancel = async () => {
        // Clear Redux cache and reload from database
        dispatch(clearSpeedMarchForm({ ocId, semester: semesterNumber }));
        await loadAll();
        setIsEditingAll(false);
    };

    const handleTabChange = (index: number) => {
        setActiveTab(index);
        setIsEditingAll(false);
    };

    return (
        <DashboardLayout title="Assessment: Speed March / Run Back" description="Timing standards and marks for Speed March and Run Back.">
            <main className="p-6">
                <BreadcrumbNav paths={[{ label: "Dashboard", href: "/dashboard" }, { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` }, { label: "Speed March-Run Back" }]} />

                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                <DossierTab tabs={dossierTabs} defaultValue="speed-march" ocId={ocId} extraTabs={
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2">
                                <Shield className="h-4 w-4" /> Mil-Trg <ChevronDown className="h-4 w-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                            {militaryTrainingCards.map((card) => {
                                const link = card.to(ocId);
                                return (
                                    <DropdownMenuItem key={card.title} asChild>
                                        <Link href={link} className="flex items-center gap-2">
                                            <card.icon className={`h-4 w-4 ${card.color}`} />
                                            {card.title}
                                        </Link>
                                    </DropdownMenuItem>
                                );
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                }>
                    <TabsContent value="speed-march">
                        <Card className="max-w-7xl mx-auto p-6 rounded-2xl shadow-xl bg-white">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-center text-primary">
                                    SPEED MARCH / RUN BACK
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                <div className="flex justify-center mb-6 space-x-2">
                                    {terms.map((term, idx) => {
                                        return (
                                            <button
                                                key={term}
                                                type="button"
                                                onClick={() => handleTabChange(idx)}
                                                className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === idx ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
                                            >
                                                {term}
                                            </button>
                                        );
                                    })}
                                </div>

                                <SpeedMarchForm
                                    semesterNumber={semesterNumber}
                                    savedRecords={records}
                                    onSave={handleSaveTerm}
                                    isEditing={isEditingAll}
                                    onCancelEdit={handleCancel}
                                    formMethods={formMethods}
                                    isSaving={isSaving}
                                />

                                <div className="flex justify-center mb-4">
                                    {!isEditingAll ? (
                                        <Button type="button" onClick={() => setIsEditingAll(true)} disabled={isSaving}>
                                            Edit Table
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