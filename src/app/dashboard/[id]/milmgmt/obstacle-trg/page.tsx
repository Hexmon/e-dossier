// app/(dashboard)/[id]/obstacle-trg/page.tsx
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
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Shield, ChevronDown, Link } from "lucide-react";
import { toast } from "sonner";

import ObstacleTrainingForm from "@/components/obstacle/ObstacleTrainingForm";
import { obstaclePrefill, terms } from "@/constants/app.constants";
import { useOcDetails } from "@/hooks/useOcDetails";
import { useObstacleTraining } from "@/hooks/useObstacleTraining";
import { Button } from "@/components/ui/button";
import { Row as ObstacleRow, TermData } from "@/types/obstacleTrg";

type Row = { id?: string; obstacle: string; obtained?: string; remark?: string };

export default function ObstacleTrgPage() {
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";

    // fetch cadet via hook (route param)
    const { cadet } = useOcDetails(ocId);
    const {
        name = "",
        courseName = "",
        ocNumber = "",
        ocId: cadetOcId = ocId,
        course = "",
    } = cadet ?? {};
    const selectedCadet = useMemo(() => ({ name, courseName, ocNumber, ocId: cadetOcId, course }), [name, courseName, ocNumber, cadetOcId, course]);

    const [activeTab, setActiveTab] = useState<number>(0);
    const semesterApiBase = 4; // IV -> 4
    const semesterNumber = activeTab + semesterApiBase;

    // hook for server records
    const { records, loading, loadAll, saveRecords, updateRecord, deleteRecord } = useObstacleTraining(ocId);

    // local state for editing toggle
    const [isEditingAll, setIsEditingAll] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // load snapshot when ocId changes
    useEffect(() => {
        if (!ocId) return;
        loadAll();
    }, [ocId, loadAll]);

    // form methods used by form component if parent wants shared control
    const formMethods = useForm<TermData>({ defaultValues: { records: obstaclePrefill } });

    const mergedForSemester = useMemo(() => {
        const savedForSem = (records ?? []).filter((r) => Number(r.semester ?? 0) === Number(semesterNumber));
        return obstaclePrefill.map((p) => {
            const { obstacle: prefObstacle, obtained: prefObtained = "", remark: prefRemark = "", id: prefId } = p as Row;
            const latest = [...savedForSem].slice().reverse().find((s) => (s.obstacle ?? "") === (prefObstacle ?? ""));
            const obstacle = prefObstacle ?? "-";
            const obtained = latest ? String(latest.marksObtained ?? "") : String(prefObtained ?? "");
            const remark = latest ? String(latest.remark ?? "") : String(prefRemark ?? "");
            const id = latest ? latest.id : prefId;
            return { id, obstacle, obtained, remark };
        });
    }, [records, semesterNumber]);

    // save handler for whole term (called by form submit)
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
                setIsEditingAll(false);
            } catch (err) {
                console.error(err);
                toast.error("Failed to save obstacle training");
            } finally {
                setIsSaving(false);
            }
        },
        [ocId, saveRecords, semesterNumber]
    );

    // when switching tab, reload snapshot + reset editing
    const handleTabChange = (index: number) => {
        setActiveTab(index);
        setIsEditingAll(false);
        void loadAll();
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
                                                className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === idx ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
                                            >
                                                {term}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Form component */}
                                <ObstacleTrainingForm
                                    semesterNumber={semesterNumber}
                                    inputPrefill={mergedForSemester}
                                    savedRecords={records}
                                    onSave={handleSaveTerm}
                                    isEditing={isEditingAll}
                                    onCancelEdit={() => setIsEditingAll(false)}
                                    formMethods={formMethods}
                                />

                                {/* Edit / Save toggle (outside form to avoid accidental submits) */}
                                <div className="flex justify-center mb-4">
                                    {!isEditingAll ? (
                                        <Button type="button" onClick={() => setIsEditingAll(true)} disabled={isSaving}>
                                            Edit
                                        </Button>
                                    ) : null}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}