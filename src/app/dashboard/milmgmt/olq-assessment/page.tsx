"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";

import { useForm, FormProvider, useFormContext } from "react-hook-form";
import OLQForm from "@/components/olq/OLQForm";
import OLQView from "@/components/olq/OLQView";
import { OlqFormValues } from "@/types/olq";
import { useOlqActions } from "@/hooks/useOlqActions";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { Shield, ChevronDown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger as InnerTabsTrigger, TabsContent as InnerTabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { GRADE_BRACKETS, OLQ_STRUCTURE } from "@/constants/app.constants";
import { toast } from "sonner";

function buildInitialValues() {
    const flat: Record<string, any> = {};
    Object.values(OLQ_STRUCTURE).forEach((arr) => {
        arr.forEach((s) => (flat[s.id] = ""));
    });
    return flat;
}

export default function OLQPage() {
    const selectedCadet = useSelector((s: RootState) => s.cadet.selectedCadet);
    const methods = useForm<OlqFormValues>({ defaultValues: buildInitialValues() });

    return (
        <DashboardLayout title="OLQ Assessment" description="OLQ assessment">
            <main className="p-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: "/dashboard/milmgmt" },
                        { label: "OLQ Assessment" },
                    ]}
                />

                {selectedCadet && <SelectedCadetTable selectedCadet={selectedCadet} />}

                <FormProvider {...methods}>
                    <InnerOLQPage selectedCadet={selectedCadet} />
                </FormProvider>
            </main>
        </DashboardLayout>
    );
}

function InnerOLQPage({ selectedCadet }: { selectedCadet: any }) {
    const { register, reset, getValues, setValue, handleSubmit } = useFormContext<OlqFormValues>();
    const { fetchOlq, submitOlq, updateOlq, deleteOlqForSemester } = useOlqActions(selectedCadet);

    const semesters = ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];
    const [activeSem, setActiveSem] = useState<number>(0);
    const [activeInnerTab, setActiveInnerTab] = useState<"input" | "view">("input");
    const [submissions, setSubmissions] = useState<(any | null)[]>(Array(6).fill(null));
    const [serverRecordsMap, setServerRecordsMap] = useState<Record<number, any[]>>({});
    const [refreshFlag, setRefreshFlag] = useState(0);

    useEffect(() => {
        if (!selectedCadet) return;
        const load = async () => {
            const sem = activeSem + 1;
            const items = await fetchOlq(sem);
            setServerRecordsMap((prev) => ({ ...prev, [sem]: items }));
            if (items && items.length) {
                const marks: Record<string, number> = {};
                let total = 0;
                items.forEach((rec: any) => {
                    (rec.scores || []).forEach((s: any) => {
                        const m = Number(s.marksScored) || 0;
                        marks[s.subtitleId] = m;
                        total += m;
                    });
                });
                const GRADE_BRACKETS = (await import("@/constants/app.constants")).GRADE_BRACKETS;
                const match = GRADE_BRACKETS.find((b: any) => total >= b.min && total <= b.max);
                const bracketKey = match ? match.key : "poor";
                setSubmissions((prev: any) => { const cp = [...prev]; cp[activeSem] = { marks, total, bracketKey }; return cp; });
                const flatInit: any = {};
                Object.values(OLQ_STRUCTURE).flat().forEach((s: any) => flatInit[s.id] = "");
                items.forEach((rec: any) => {
                    (rec.scores || []).forEach((sc: any) => {
                        flatInit[sc.subtitleId] = sc.marksScored ?? "";
                    });
                });
                reset(flatInit);
            } else {
                setSubmissions((prev: any) => { const cp = [...prev]; cp[activeSem] = null; return cp; });
                const flatInit: any = {};
                Object.values(OLQ_STRUCTURE).flat().forEach((s: any) => flatInit[s.id] = "");
                reset(flatInit);
            }
        };
        load();
    }, [selectedCadet, activeSem, refreshFlag]);

    const clearForm = () => {
        const flatInit: any = {};
        Object.values(OLQ_STRUCTURE).flat().forEach((s: any) => flatInit[s.id] = "");
        reset(flatInit);
        setSubmissions((prev: any) => { const cp = [...prev]; cp[activeSem] = null; return cp; });
        setActiveInnerTab("input");
    };

    const onSubmit = handleSubmit(async (vals: any) => {
        const sem = activeSem + 1;
        const perRemarkPayloads: any[] = [];

        for (const [remark, subtitles] of Object.entries(OLQ_STRUCTURE)) {
            const scores = subtitles.map((s: any) => ({
                subtitleId: s.id,
                marksScored: Number(vals[s.id] || 0),
            }));

            perRemarkPayloads.push({
                semester: sem,
                remarks: remark,
                scores,
            });
        }

        const existing = serverRecordsMap[sem] ?? [];

        for (const payload of perRemarkPayloads) {
            const existingRec = existing.find((r: any) => String(r.remarks) === String(payload.remarks));
            if (existingRec) {
                const existingIds = (existingRec.scores || []).map((s: any) => s.subtitleId);
                const postedIds = payload.scores.map((s: any) => s.subtitleId);
                const deleteSubtitleIds = existingIds.filter((id: any) => !postedIds.includes(id));
                const updatePayload = {
                    ...payload,
                    deleteSubtitleIds: deleteSubtitleIds.length ? deleteSubtitleIds : undefined,
                };
                await updateOlq(sem, updatePayload);
            } else {
                await createOcOlqRecordWrapper(payload);
            }
        }

        setRefreshFlag((f) => f + 1);
        setActiveInnerTab("view");
        toast.success("OLQ saved");
    });

    const createOcOlqRecordWrapper = async (payload: any) => {
        const { createOcOlqRecord } = await import("@/app/lib/api/olqApi");
        if (!selectedCadet?.ocId) { toast.error("No cadet selected"); return; }
        try {
            await createOcOlqRecord(selectedCadet.ocId, payload);
        } catch (err) {
            console.error(err);
        }
    };

    const deleteSemester = async () => {
        const ok = await deleteOlqForSemester(activeSem + 1);
        if (ok) {
            setRefreshFlag(f => f + 1);
            reset(Object.values(OLQ_STRUCTURE).flat().reduce((acc: any, s: any) => { acc[s.id] = ""; return acc; }, {}));
            setSubmissions((prev: any) => { const cp = [...prev]; cp[activeSem] = null; return cp; });
        }
    };

    return (
        <DossierTab
            tabs={dossierTabs}
            defaultValue="olq-assessment"
            extraTabs={
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <TabsTrigger value="mil-trg"><Shield className="h-4 w-4" /> Mil-Trg</TabsTrigger>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                        {militaryTrainingCards.map(card => (
                            <DropdownMenuItem key={card.to} asChild>
                                <a href={card.to} className="flex items-center gap-2">
                                    <card.icon className={`h-4 w-4 ${card.color}`} />{card.title}
                                </a>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            }
        >
            <TabsContent value="olq-assessment">
                <Card className="shadow-lg rounded-xl p-6">
                    <div className="flex justify-center mb-6 space-x-2">
                        {["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"].map((sem, idx) => (
                            <button key={sem}
                                type="button"
                                onClick={() => { setActiveSem(idx); setActiveInnerTab("input"); }}
                                className={`px-4 py-2 rounded-t-lg font-medium ${activeSem === idx ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
                            >
                                {sem}
                            </button>
                        ))}
                    </div>

                    <Tabs value={activeInnerTab} onValueChange={(v: any) => setActiveInnerTab(v)}>
                        <TabsList className="mb-4">
                            <InnerTabsTrigger value="input">Input</InnerTabsTrigger>
                            <InnerTabsTrigger value="view">View</InnerTabsTrigger>
                        </TabsList>

                        <InnerTabsContent value="input">
                            <Card className="shadow-lg rounded-xl p-6">
                                <CardHeader><CardTitle>OLQ Input Form</CardTitle></CardHeader>
                                <CardContent>
                                    <OLQForm
                                        register={register}
                                        structure={OLQ_STRUCTURE}
                                        onSubmit={onSubmit}
                                        onClear={clearForm}
                                        onDeleteSemester={deleteSemester}
                                        onReset={() => reset(Object.values(OLQ_STRUCTURE).flat().reduce((acc: any, s: any) => { acc[s.id] = ""; return acc; }, {}))}
                                        showDelete={true}
                                    />
                                </CardContent>
                            </Card>
                        </InnerTabsContent>

                        <InnerTabsContent value="view">
                            <Card className="shadow-lg rounded-xl p-6">
                                <CardHeader><CardTitle>OLQ Result</CardTitle></CardHeader>
                                <CardContent>
                                    <OLQView
                                        structure={OLQ_STRUCTURE}
                                        submission={submissions[activeSem]}
                                        onEdit={() => setActiveInnerTab("input")}
                                        onDeleteSemester={deleteSemester}
                                    />
                                </CardContent>
                            </Card>
                        </InnerTabsContent>
                    </Tabs>
                </Card>
            </TabsContent>
        </DossierTab>
    );
}