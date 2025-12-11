"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "next/navigation";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import SportsGamesTable from "@/components/sports/SportsTable";
import SportsForm from "@/components/sports/SportsForm";

import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Shield, ChevronDown } from "lucide-react";

import { springPrefill, autumnPrefill, motivationPrefill } from "@/constants/app.constants";
import { useOcPersonal } from "@/hooks/useOcPersonal";
import { useSportsAwards } from "@/hooks/useSportsAwards";
import { toast } from "sonner";

import type { Row, SemesterData } from "@/types/sportsAwards";
import { useOcDetails } from "@/hooks/useOcDetails";
import Link from "next/link";

export default function SportsGamesPage() {
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";

    // cadet from ocId
    const { cadet } = useOcDetails(ocId);

    const { name = "", courseName = "", ocNumber = "", ocId: cadetOcId = ocId, course = "" } = cadet ?? {};
    const selectedCadet = useMemo(() => ({ name, courseName, ocNumber, ocId: cadetOcId, course }), [name, courseName, ocNumber, cadetOcId, course]);

    const semesters = useMemo(() => ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"], []);
    const [activeTab, setActiveTab] = useState(0);

    // hook for saved data / apis
    const {
        savedData,
        setSavedData,
        loading: loadingSaved,
        loadAll,
        upsertSportsRows,
        upsertMotivationRows,
        removeRowLocal,
    } = useSportsAwards(ocId, semesters.length);

    // form
    const { register, handleSubmit, reset, getValues } = useForm<SemesterData>({
        defaultValues: {
            spring: springPrefill,
            autumn: autumnPrefill,
            motivation: motivationPrefill,
        },
    });

    const [isSaving, setIsSaving] = useState(false);
    const [editing, setEditing] = useState({ spring: false, autumn: false, motivation: false });

    useEffect(() => {
        if (!ocId) return;
        loadAll();
    }, [ocId, loadAll]);

    useEffect(() => {
        const current = savedData[activeTab];
        if (!current) return;

        reset({
            spring: mergePrefillWithSaved(springPrefill, current.spring),
            autumn: mergePrefillWithSaved(autumnPrefill, current.autumn),
            motivation: mergeMotivationWithSaved(motivationPrefill, current.motivation),
        });
    }, [savedData, activeTab, reset]);

    // helpers to merge prefill with saved rows (keeps prefill order)
    const mergePrefillWithSaved = (prefill: Row[], saved: Row[]) =>
        prefill.map((p) => {
            const { activity } = p;
            const found = saved.find((s) => s.activity === activity);
            return found
                ? { 
                    ...found, 
                    activity: found.activity ?? activity, 
                    string: found.string ?? p.string ?? "-", 
                    maxMarks: found.maxMarks ?? p.maxMarks, 
                    obtained: found.obtained ?? p.obtained ?? "" 
                }
                : { 
                    ...p, 
                    string: p.string ?? "-", 
                    maxMarks: p.maxMarks ?? 0, 
                    obtained: p.obtained ?? "" 
                };
        });

    const mergeMotivationWithSaved = (prefill: Row[], saved: Row[]) => {
        const savedMap = new Map<string, Row>();
        saved.forEach((s) => {
            if (s.activity) savedMap.set(s.activity, s);
        });

        return prefill.map((p) => {
            const { activity } = p;
            const found = savedMap.get(activity ?? "");
            return found
                ? { 
                    ...found, 
                    activity: found.activity ?? activity, 
                    string: found.string ?? p.string ?? "-", 
                    maxMarks: found.maxMarks ?? p.maxMarks, 
                    obtained: found.obtained ?? p.obtained ?? "" 
                }
                : { 
                    ...p, 
                    string: p.string ?? "-", 
                    maxMarks: p.maxMarks ?? 0, 
                    obtained: p.obtained ?? "" 
                };
        });
    };

    // Validation helper
    const validateTermRows = (rows: Row[]): boolean => {
        for (const r of rows) {
            const maxMarks = Number(r?.maxMarks ?? 0);
            const obtained = Number(r?.obtained ?? 0);

            // Validate max marks is not negative
            if (!Number.isNaN(maxMarks) && maxMarks < 0) {
                toast.error("Max Marks cannot be negative");
                return false;
            }

            // Validate obtained marks is not negative
            if (!Number.isNaN(obtained) && obtained < 0) {
                toast.error("Obtained marks cannot be negative");
                return false;
            }

            // Validate obtained <= maxMarks
            if (!Number.isNaN(maxMarks) && !Number.isNaN(obtained) && obtained > maxMarks) {
                toast.error("Obtained marks cannot exceed Max Marks");
                return false;
            }

            // Validate string field for motivation (activity and string should not be empty)
            if (r.string && String(r.string).trim() === "") {
                // Allow empty strings, but validate if needed based on requirements
            }
        }
        return true;
    };

    // submit a term
    const submitTerm = useCallback(async (termKey: "spring" | "autumn" | "motivation") => {
        if (!ocId) {
            toast.error("No cadet selected");
            return;
        }
        const semesterNumber = activeTab + 1;
        const rows: Row[] = getValues(termKey) ?? [];

        // Validate rows
        if (!validateTermRows(rows)) {
            return;
        }

        setIsSaving(true);
        try {
            if (termKey === "motivation") {
                await upsertMotivationRows(semesterNumber, rows);
            } else {
                await upsertSportsRows(semesterNumber, termKey, rows);
            }

            // locally update savedData snapshot
            setSavedData((prev) => {
                const copy = prev.map((s) => ({ spring: [...s.spring], autumn: [...s.autumn], motivation: [...s.motivation] }));
                copy[activeTab] = { ...copy[activeTab], [termKey]: [...rows] } as SemesterData;
                return copy;
            });

            setEditing((s) => ({ ...s, [termKey]: false }));
        } catch (err) {
            console.error(err);
            toast.error("Failed to save term");
        } finally {
            setIsSaving(false);
        }
    }, [activeTab, getValues, ocId, upsertMotivationRows, upsertSportsRows, setSavedData]);

    // local update/delete handlers (table can call these)
    const handleRowUpdated = useCallback(
        (term: keyof SemesterData, updatedRow: Row, index: number) => {
            setSavedData(prev => {
                const copy = prev.map(s => ({
                    spring: [...s.spring],
                    autumn: [...s.autumn],
                    motivation: [...s.motivation]
                }));

                // Update the target row by index
                const termRows = [...copy[activeTab][term]];
                termRows[index] = { ...termRows[index], ...updatedRow };

                copy[activeTab] = {
                    ...copy[activeTab],
                    [term]: termRows
                };

                return copy;
            });
        },
        [activeTab, setSavedData]
    );

    const handleRowDeleted = useCallback((term: keyof SemesterData, id: string) => {
        // optimistic update; the hook's API remove should be wired if you want server delete too
        setSavedData((prev) => {
            const copy = prev.map((s) => ({ spring: [...s.spring], autumn: [...s.autumn], motivation: [...s.motivation] }));
            copy[activeTab] = { ...copy[activeTab], [term]: copy[activeTab][term].filter((r) => r.id !== id) } as SemesterData;
            return copy;
        });
        // also call a hook function to remove server-side when implemented
        // removeRowLocal(activeTab, term, id);
    }, [activeTab, setSavedData]);

    // memoized rows to pass to table (prefill + saved)
    const memoizedSpringRows = useMemo(() => springPrefill, []);
    const memoizedAutumnRows = useMemo(() => autumnPrefill, []);
    const memoizedMotivationRows = useMemo(() => motivationPrefill, []);
    const memoSavedSpring = useMemo(() => savedData[activeTab]?.spring ?? [], [savedData, activeTab]);
    const memoSavedAutumn = useMemo(() => savedData[activeTab]?.autumn ?? [], [savedData, activeTab]);
    const memoSavedMotivation = useMemo(() => savedData[activeTab]?.motivation ?? [], [savedData, activeTab]);

    return (
        <DashboardLayout title="Assessment: Sports / Games & Motivation Awards" description="Enter marks for sports and motivation awards.">
            <main className="p-6">
                <BreadcrumbNav paths={[{ label: "Dashboard", href: "/dashboard" }, { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` }, { label: "Sports - Games Assessment" }]} />

                {cadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                <DossierTab tabs={dossierTabs} defaultValue="sports-awards" ocId={ocId} extraTabs={
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
                    <TabsContent value="sports-awards" className="space-y-6">
                        <Card className="max-w-6xl mx-auto p-6 rounded-2xl shadow-xl bg-white">
                            <CardHeader><CardTitle className="text-lg font-semibold text-center text-primary">SPORTS / GAMES ASSESSMENT & MOTIVATION AWARDS</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex justify-center mb-6 space-x-2">
                                    {semesters.map((sem, idx) => {
                                        return (
                                            <button key={sem} type="button" onClick={() => setActiveTab(idx)} className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === idx ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}>
                                                {sem}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* SPRING */}
                                <div role="form">
                                    <SportsGamesTable
                                        title="SPRING TERM"
                                        termKey="spring"
                                        rows={memoizedSpringRows}
                                        savedRows={memoSavedSpring}
                                        register={register}
                                        disabled={!editing.spring}
                                        onRowUpdated={(updatedRow, index) =>
                                            handleRowUpdated("spring", updatedRow, index)
                                        }
                                    />
                                    <SportsForm
                                        termKey="spring"
                                        isSaving={isSaving}
                                        editing={editing.spring}
                                        onSave={() => (editing.spring ? handleSubmit(() => submitTerm("spring"))() : setEditing((s) => ({ ...s, spring: true })))}
                                        onCancel={async () => { if (!ocId) return; await loadAll(); setEditing((s) => ({ ...s, spring: false })); }}
                                        onReset={() => reset({ spring: springPrefill })}
                                    />
                                </div>

                                {/* AUTUMN */}
                                <div role="form">
                                    <SportsGamesTable
                                        title="AUTUMN TERM"
                                        termKey="autumn"
                                        rows={memoizedAutumnRows}
                                        savedRows={memoSavedAutumn}
                                        register={register}
                                        disabled={!editing.autumn}
                                        onRowUpdated={(updatedRow, index) =>
                                            handleRowUpdated("autumn", updatedRow, index)
                                        }
                                    />
                                    <SportsForm
                                        termKey="autumn"
                                        isSaving={isSaving}
                                        editing={editing.autumn}
                                        onSave={() => (editing.autumn ? handleSubmit(() => submitTerm("autumn"))() : setEditing((s) => ({ ...s, autumn: true })))}
                                        onCancel={async () => { if (!ocId) return; await loadAll(); setEditing((s) => ({ ...s, autumn: false })); }}
                                        onReset={() => reset({ autumn: autumnPrefill })}
                                    />
                                </div>

                                {/* MOTIVATION */}
                                <div role="form">
                                    <SportsGamesTable
                                        title="Motivation Awards"
                                        termKey="motivation"
                                        rows={memoizedMotivationRows}
                                        savedRows={memoSavedMotivation}
                                        register={register}
                                        disabled={!editing.motivation}
                                        onRowUpdated={(updatedRow, index) =>
                                            handleRowUpdated("motivation", updatedRow, index)
                                        }
                                    />
                                    <SportsForm
                                        termKey="motivation"
                                        isSaving={isSaving}
                                        editing={editing.motivation}
                                        onSave={() =>
                                            editing.motivation
                                                ? handleSubmit(() => submitTerm("motivation"))()
                                                : setEditing((s) => ({ ...s, motivation: true }))
                                        }
                                        onCancel={async () => {
                                            if (!ocId) return;
                                            await loadAll();
                                            setEditing((s) => ({ ...s, motivation: false }));
                                        }}
                                        onReset={() => reset({ motivation: motivationPrefill })}
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