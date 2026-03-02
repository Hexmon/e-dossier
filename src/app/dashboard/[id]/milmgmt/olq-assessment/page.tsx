"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import DossierTab from "@/components/Tabs/DossierTab";

import { dossierTabs, militaryTrainingCards } from "@/config/app.config";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { Shield, ChevronDown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger as InnerTabTrigger, TabsContent as InnerTabContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import OLQForm from "@/components/olq/OLQForm";
import OLQView from "@/components/olq/OLQView";

import { useOlqActions } from "@/hooks/useOlqActions";
import { GRADE_BRACKETS } from "@/constants/app.constants";
import { useOcDetails } from "@/hooks/useOcDetails";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Cadet } from "@/types/cadet";

type OlqFormValues = Record<string, any>;

const TERMS = ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];

export default function OLQPage() {
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";

    // Load cadet data via hook (no redux)
    const { cadet } = useOcDetails(ocId);

    const {
        name = "",
        courseName = "",
        ocNumber = "",
        ocId: cadetOcId = ocId,
        course = "",
    } = cadet ?? {};

    const selectedCadet = {
        name,
        courseName,
        ocNumber,
        ocId: cadetOcId,
        course,
    };

    // react-hook-form
    const methods = useForm<OlqFormValues>({
        defaultValues: {},
    });

    return (
        <DashboardLayout title="OLQ Assessment" description="OLQ assessment">
            <main className="p-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: `/dashboard/${id}/milmgmt` },
                        { label: "OLQ Assessment" },
                    ]}
                />

                {selectedCadet && <SelectedCadetTable selectedCadet={selectedCadet} />}

                <FormProvider {...methods}>
                    <InnerOLQPage selectedCadet={selectedCadet} ocId={ocId} />
                </FormProvider>
            </main>
        </DashboardLayout>
    );
}

function InnerOLQPage({ selectedCadet, ocId }: { selectedCadet: Cadet; ocId: string; }) {
    const { register, reset, getValues, handleSubmit, setValue } = useForm<OlqFormValues>();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const { fetchCategories, fetchSemester, createRecord, updateRecord, deleteSemester } = useOlqActions(selectedCadet);

    const semParam = searchParams.get("semester");
    const resolvedSemIndex = useMemo(() => {
        const parsed = Number(semParam);
        if (!Number.isFinite(parsed)) return 0;
        const idx = parsed - 1;
        if (idx < 0 || idx >= TERMS.length) return 0;
        return idx;
    }, [semParam]);
    const [activeSemIndex, setActiveSemIndex] = useState<number>(resolvedSemIndex);
    const [activeInnerTab, setActiveInnerTab] = useState<"input" | "view">("input");

    const [structure, setStructure] = useState<Record<string, any[]>>({});
    const [templateMissingNotice, setTemplateMissingNotice] = useState<string | null>(null);
    const [loadingStructure, setLoadingStructure] = useState<boolean>(true);

    const [serverRecordsPerSem, setServerRecordsPerSem] = useState<Record<number, any[]>>({});
    const [submissions, setSubmissions] = useState<(any | null)[]>(Array(6).fill(null));
    const [refreshFlag, setRefreshFlag] = useState<number>(0);
    const [loadingSemester, setLoadingSemester] = useState<boolean>(false);

    useEffect(() => {
        setActiveSemIndex(resolvedSemIndex);
    }, [resolvedSemIndex]);

    const updateSemesterParam = (index: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("semester", String(index + 1));
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const handleSemesterChange = (index: number) => {
        setActiveSemIndex(index);
        updateSemesterParam(index);
        setActiveInnerTab("input");
    };

    useEffect(() => {
        if (!selectedCadet) return;

        let mounted = true;
        (async () => {
            setLoadingStructure(true);
            try {
                const categoryResponse = await fetchCategories();
                if (!mounted) return;
                const categories = categoryResponse.items ?? [];
                const missingMessage = categoryResponse.templateMissing
                    ? (categoryResponse.message || "OLQ template is not configured for this course. Contact admin.")
                    : null;
                setTemplateMissingNotice(missingMessage);

                const mapped: Record<string, any[]> = {};
                categories.forEach((cat: any) => {
                    mapped[cat.title] = (cat.subtitles ?? []).map((sub: any) => ({
                        id: sub.id,
                        subtitle: sub.subtitle,
                        maxMarks: sub.maxMarks,
                        displayOrder: sub.displayOrder,
                        categoryId: cat.id,
                    }));
                });

                setStructure(mapped);

                const flatInit: any = {};
                Object.values(mapped).flat().forEach((s: any) => (flatInit[s.id] = ""));
                reset(flatInit);
            } catch (err) {
                console.error(err);
                toast.error("Failed to load OLQ categories");
            } finally {
                if (mounted) setLoadingStructure(false);
            }
        })();

        return () => { mounted = false; };
    }, [selectedCadet]);

    useEffect(() => {
        if (!selectedCadet) return;
        if (!Object.keys(structure).length) return;

        let mounted = true;
        (async () => {
            setLoadingSemester(true);
            const semester = activeSemIndex + 1;
            try {
                const items = await fetchSemester(semester);
                if (!mounted) return;

                setServerRecordsPerSem(prev => ({ ...prev, [semester]: items }));
                const marks: Record<string, number> = {};
                let total = 0;

                (items || []).forEach((cat: any) => {
                    (cat.subtitles || []).forEach((s: any) => {
                        const m = Number(s.marksScored) || 0;
                        marks[s.subtitleId] = m;
                        total += m;
                    });
                });

                const bracket = (GRADE_BRACKETS.find(b => total >= b.min && total <= b.max) || { key: "poor" }).key;
                setSubmissions(prev => { const cp = [...prev]; cp[activeSemIndex] = { marks, total, bracketKey: bracket }; return cp; });

                const flatInit: any = {};
                Object.values(structure).flat().forEach((s: any) => flatInit[s.id] = "");
                (items || []).forEach((cat: any) => {
                    (cat.subtitles || []).forEach((s: any) => {
                        flatInit[s.subtitleId] = s.marksScored ?? "";
                    });
                });
                reset(flatInit);
            } catch (err) {
            } finally {
                if (mounted) setLoadingSemester(false);
            }
        })();

        return () => { mounted = false; };
    }, [selectedCadet, structure, activeSemIndex, refreshFlag]);

    const clearForm = useCallback(() => {
        const flatInit: any = {};
        Object.values(structure).flat().forEach((s: any) => (flatInit[s.id] = ""));
        reset(flatInit);
        setSubmissions(prev => { const cp = [...prev]; cp[activeSemIndex] = null; return cp; });
        setActiveInnerTab("input");
    }, [structure, activeSemIndex, reset]);

    const findExistingRecordForCategory = (items: any[], categorySubIds: string[]) => {
        if (!items || !items.length) return undefined;
        return items.find((r: any) => (r.scores || []).some((s: any) => categorySubIds.includes(s.subtitleId)));
    };

    const onSubmit = handleSubmit(async (vals) => {
        if (!selectedCadet) { toast.error("No cadet selected"); return; }
        if (templateMissingNotice) {
            toast.error(templateMissingNotice);
            return;
        }
        const semester = activeSemIndex + 1;
        const itemsForSem = serverRecordsPerSem[semester] ?? [];

        const categories = Object.entries(structure);
        try {
            for (const [title, subtitles] of categories) {
                const subIds = subtitles.map((s: any) => s.id);
                const scores = subtitles.map((s: any) => ({
                    subtitleId: s.id,
                    marksScored: Number(vals[s.id] ?? 0)
                }));

                const hasAny = scores.some(sc => sc.marksScored > 0);
                if (!hasAny) {
                    continue;
                }

                const existing = findExistingRecordForCategory(itemsForSem, subIds);

                if (existing) {
                    const existingIds = (existing.scores || []).map((s: any) => s.subtitleId);
                    const postedIds = scores.map(s => s.subtitleId);
                    const deleteSubtitleIds = existingIds.filter((id: string) => !postedIds.includes(id));
                    const payload: any = { semester, scores };
                    if (deleteSubtitleIds.length) payload.deleteSubtitleIds = deleteSubtitleIds;
                    await updateRecord(payload);
                } else {
                    const payload = { semester, scores };
                    await createRecord(payload);
                }
            }

            toast.success("OLQ records saved");
            setActiveInnerTab("view");
            setRefreshFlag(f => f + 1);
        } catch (err) {
            console.error(err);
            toast.error("Failed to save OLQ");
        }
    });

    const handleDeleteSemester = async () => {
        if (templateMissingNotice) {
            toast.error(templateMissingNotice);
            return;
        }
        const ok = await deleteSemester(activeSemIndex + 1);
        if (ok) {
            const flatInit: any = {};
            Object.values(structure).flat().forEach((s: any) => flatInit[s.id] = "");
            reset(flatInit);
            setSubmissions(prev => { const cp = [...prev]; cp[activeSemIndex] = null; return cp; });
            setRefreshFlag(f => f + 1);
        }
    };

    // UI: loading guard
    if (!selectedCadet) {
        return null;
    }

    return (
        <DossierTab
            tabs={dossierTabs}
            defaultValue="olq-assessment"
            ocId={ocId}
            extraTabs={
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <TabsTrigger value="mil-trg"><Shield className="h-4 w-4" /> Mil-Trg</TabsTrigger>
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
            }
        >
            <TabsContent value="olq-assessment">
                <Card className="shadow-lg rounded-xl p-6">
                    <div className="flex justify-center mb-6 space-x-2">
                        {TERMS.map((t, idx) => {
                            return (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => handleSemesterChange(idx)}
                                    className={`px-4 py-2 rounded-t-lg font-medium ${activeSemIndex === idx ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
                                >{t}</button>
                            )
                        })}
                    </div>

                    <Tabs value={activeInnerTab} onValueChange={(v: any) => setActiveInnerTab(v)}>
                        <TabsList className="mb-4">
                            <InnerTabTrigger value="input">Input</InnerTabTrigger>
                            <InnerTabTrigger value="view">View</InnerTabTrigger>
                        </TabsList>

                        <InnerTabContent value="input">
                            <Card className="shadow-lg rounded-xl p-6">
                                <CardHeader><CardTitle>OLQ Input Form</CardTitle></CardHeader>
                                <CardContent>
                                    {loadingStructure ? (
                                        <p className="text-center py-6">Loading categories...</p>
                                    ) : templateMissingNotice ? (
                                        <div className="rounded-lg border border-warning/30 bg-warning/20 p-4 text-warning-foreground">
                                            {templateMissingNotice}
                                        </div>
                                    ) : !Object.keys(structure).length ? (
                                        <p className="text-center py-6 text-muted-foreground">
                                            No OLQ categories available for this course.
                                        </p>
                                    ) : (
                                        <OLQForm
                                            register={register}
                                            structure={structure}
                                            onSubmit={onSubmit}
                                            onClear={clearForm}
                                            showDelete={true}
                                            onDeleteSemester={handleDeleteSemester}
                                            onReset={() => {
                                                const flatInit: any = {};
                                                Object.values(structure).flat().forEach((s: any) => flatInit[s.id] = "");
                                                reset(flatInit);
                                            }}
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        </InnerTabContent>

                        <InnerTabContent value="view">
                            <Card className="shadow-lg rounded-xl p-6">
                                <CardHeader><CardTitle>OLQ Result</CardTitle></CardHeader>
                                <CardContent>
                                    {loadingSemester ? (
                                        <p className="text-center py-6">Loading results...</p>
                                    ) : templateMissingNotice ? (
                                        <div className="rounded-lg border border-warning/30 bg-warning/20 p-4 text-warning-foreground">
                                            {templateMissingNotice}
                                        </div>
                                    ) : (
                                        <OLQView structure={structure} submission={submissions[activeSemIndex]} />
                                    )}

                                    {/* Edit & Delete controls inside view tab */}
                                    {!templateMissingNotice && (
                                        <div className="mt-4 flex justify-center gap-4">
                                            <Button onClick={() => setActiveInnerTab("input")}>Edit Scores</Button>
                                            {/* <Button variant="destructive" onClick={handleDeleteSemester}>Delete Semester</Button> */}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </InnerTabContent>
                    </Tabs>
                </Card>
            </TabsContent>
        </DossierTab>
    );
}
