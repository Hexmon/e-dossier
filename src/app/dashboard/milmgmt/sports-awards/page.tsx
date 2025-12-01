"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { Row, SemesterData } from "@/types/sportsAwards";
import { autumnPrefill, motivationPrefill, springPrefill } from "@/constants/app.constants";
import SportsGamesTable from "@/components/sports/SportsTable";
import DossierTab from "@/components/Tabs/DossierTab";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { ChevronDown, Shield } from "lucide-react";

import { createMotivationAward, getMotivationAwards } from "@/app/lib/api/motivationAwardsApi";
import { updateMotivationAward } from "@/app/lib/api/motivationAwardApi";
import { listSportsAndGames, saveSportsGame, updateSportsAndGames } from "@/app/lib/api/sportsAndGamesApi";

// allow passing extra callbacks that the table component's Props type may not express yet
const SportsGamesTableAny = SportsGamesTable as unknown as React.ComponentType<any>;

export default function SportsGamesPage() {
    const semesters = useMemo(() => ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"], []);
    const [activeTab, setActiveTab] = useState(0);
    const selectedCadet = useSelector((s: RootState) => s.cadet.selectedCadet);

    const [savedData, setSavedData] = useState<SemesterData[]>(() => semesters.map(() => ({ spring: [], autumn: [], motivation: [] })));
    const [isSaving, setIsSaving] = useState(false);
    const [editing, setEditing] = useState({ spring: false, autumn: false, motivation: false });

    const { register, handleSubmit, reset, getValues } = useForm<SemesterData>({
        defaultValues: { spring: springPrefill, autumn: autumnPrefill, motivation: motivationPrefill },
    });

    const buildEmptyState = useCallback((): SemesterData[] => semesters.map(() => ({ spring: [], autumn: [], motivation: [] })), [semesters]);

    const mergePrefillWithSaved = useCallback((prefill: Row[], saved: Row[]) =>
        prefill.map((p) => {
            const { activity, string, maxMarks, obtained } = p;
            const found = saved.find((s) => s.activity === activity);
            return found
                ? {
                    id: found.id,
                    ocId: found.ocId,
                    activity: found.activity ?? activity,
                    string: found.string ?? string ?? "",
                    maxMarks: found.maxMarks ?? maxMarks,
                    obtained: found.obtained ?? obtained ?? "",
                }
                : p;
        }), []);

    const mergeMotivationWithSaved = useCallback((prefill: Row[], saved: Row[]) => {
        const savedMap = new Map<string, Row>();
        // Use Map to ensure we get the latest saved record for each activity
        saved.forEach(s => {
            if (s.activity) savedMap.set(s.activity, s);
        });

        return prefill.map((p) => {
            const { activity, string, maxMarks, obtained } = p;
            const found = savedMap.get(activity || "");
            return found
                ? {
                    id: found.id,
                    ocId: found.ocId,
                    activity: found.activity ?? activity,
                    string: found.string ?? string ?? "",
                    maxMarks: found.maxMarks ?? maxMarks,
                    obtained: found.obtained ?? obtained ?? "",
                }
                : p;
        });
    }, []);

    const safeSetSavedData = useCallback((updater: (prev: SemesterData[]) => SemesterData[]) => setSavedData((prev) => updater(prev)), []);

    const upsertSportsRows = useCallback(async (ocId: string, semesterNumber: number, term: "spring" | "autumn", rows: Row[]) => {
        for (const r of rows) {
            const { id, activity, string, maxMarks, obtained } = r;
            const payload = { sport: activity, sportsStrings: string || "", maxMarks: Number(maxMarks), marksObtained: Number(obtained || 0) };
            if (id) {
                await updateSportsAndGames(ocId, String(id), payload);
            } else if (String(activity || "").trim() !== "") {
                await saveSportsGame(ocId, { semester: semesterNumber, term, ...payload });
            }
        }
    }, []);

    const upsertMotivationRows = useCallback(async (ocId: string, semesterNumber: number, rows: Row[]) => {
        for (const r of rows) {
            const { id, activity, string, maxMarks, obtained } = r;
            const payload = { fieldName: activity, motivationTitle: string || "-", maxMarks: Number(maxMarks), marksObtained: Number(obtained || 0) };
            if (id) {
                await updateMotivationAward(ocId, String(id), payload);
            } else if (String(activity || "").trim() !== "") {
                await createMotivationAward(ocId, { semester: semesterNumber, ...payload });
            }
        }
    }, []);

    const isLoadingRef = useRef(false);

    const loadSavedData = useCallback(
        async (ocId: string) => {
            if (isLoadingRef.current) return;
            isLoadingRef.current = true;
            try {
                const [sportsRes, motRes] = await Promise.all([
                    listSportsAndGames(ocId),
                    getMotivationAwards(ocId),
                ]);

                const sportsItems = sportsRes.items ?? [];
                const motivationItems = motRes ?? [];

                const grouped = buildEmptyState();

                for (const item of sportsItems) {
                    const {
                        id,
                        ocId,
                        semester,
                        term,
                        sport,
                        maxMarks,
                        marksObtained,
                    } = item;

                    const idx = Math.max(0, (Number(semester) || 1) - 1);

                    const target =
                        term === "autumn"
                            ? grouped[idx].autumn
                            : grouped[idx].spring;

                    // Avoid duplicates
                    if (!target.some((s) => s.id === id)) {
                        target.push({
                            id,
                            ocId,
                            term,
                            activity: sport ?? "-",
                            string: item.sportsStrings ?? "",
                            maxMarks: maxMarks ?? "",
                            obtained:
                                marksObtained !== undefined
                                    ? String(marksObtained)
                                    : "",
                        });
                    }
                }

                for (const item of motivationItems) {
                    const {
                        id,
                        ocId,
                        semester,
                        fieldName,
                        motivationTitle,
                        maxMarks,
                        marksObtained,
                    } = item;

                    const idx = Math.max(0, (Number(semester) || 1) - 1);

                    if (!grouped[idx].motivation.some((m) => m.id === id)) {
                        grouped[idx].motivation.push({
                            id,
                            ocId,
                            term: "motivation",
                            activity: fieldName ?? "-",
                            string: motivationTitle ?? "-",
                            maxMarks: maxMarks ?? "",
                            obtained:
                                marksObtained !== undefined
                                    ? String(marksObtained)
                                    : "",
                        });
                    }
                }
                setSavedData(grouped);

                const current =
                    grouped[activeTab] ?? {
                        spring: [],
                        autumn: [],
                        motivation: [],
                    };

                reset({
                    spring: mergePrefillWithSaved(
                        springPrefill,
                        current.spring ?? []
                    ),
                    autumn: mergePrefillWithSaved(
                        autumnPrefill,
                        current.autumn ?? []
                    ),
                    motivation: mergeMotivationWithSaved(
                        motivationPrefill,
                        current.motivation ?? []
                    ),
                });
                return grouped;
            } catch (err) {
                console.error(err);
                toast.error("Failed to load saved Sports & Awards data");
                return savedData;
            }
            finally {
                isLoadingRef.current = false;
            }
        },
        [
            activeTab,
            buildEmptyState,
            mergePrefillWithSaved,
            mergeMotivationWithSaved,
            reset,
            savedData,
            springPrefill,
            autumnPrefill,
            motivationPrefill,
        ]
    );


    useEffect(() => {
        if (!selectedCadet?.ocId) return;
        loadSavedData(selectedCadet.ocId);
    }, [selectedCadet?.ocId]);

    useEffect(() => {
        const current = savedData[activeTab];
        if (!current) return;
        reset({
            spring: mergePrefillWithSaved(springPrefill, current.spring ?? []),
            autumn: mergePrefillWithSaved(autumnPrefill, current.autumn ?? []),
            motivation: mergeMotivationWithSaved(motivationPrefill, current.motivation ?? []),
        });
    }, [activeTab, savedData, mergePrefillWithSaved, mergeMotivationWithSaved, reset]);



    const submitTerm = useCallback(async (termKey: "spring" | "autumn" | "motivation") => {
        if (!selectedCadet?.ocId) return toast.error("No cadet selected");
        const ocId = selectedCadet.ocId;
        const semesterNumber = activeTab + 1;

        // Validate obtained <= maxMarks for all rows in this term before saving
        const rows = getValues(termKey) ?? [];
        for (let r of rows) {
            const max = Number(r?.maxMarks ?? 0);
            const obtained = Number(r?.obtained ?? 0);
            if (!Number.isNaN(max) && !Number.isNaN(obtained) && obtained > max) {
                toast.error('Obtained marks cannot exceed Max Marks');
                return;
            }
        }

        setIsSaving(true);
        try {
            if (termKey === "motivation") {
                await upsertMotivationRows(ocId, semesterNumber, rows);
            } else {
                await upsertSportsRows(ocId, semesterNumber, termKey, rows);
            }
            safeSetSavedData(prev => {
                const copy = prev.map(s => ({ spring: [...s.spring], autumn: [...s.autumn], motivation: [...s.motivation] }));
                copy[activeTab] = { ...copy[activeTab], [termKey]: [...rows] };
                return copy;
            });

            reset({
                spring: mergePrefillWithSaved(springPrefill, termKey === "spring" ? rows : savedData[activeTab].spring),
                autumn: mergePrefillWithSaved(autumnPrefill, termKey === "autumn" ? rows : savedData[activeTab].autumn),
                motivation: mergeMotivationWithSaved(motivationPrefill, termKey === "motivation" ? rows : savedData[activeTab].motivation),
            });

            setEditing((s) => ({ ...s, [termKey]: false }));
            toast.success(`${termKey[0].toUpperCase() + termKey.slice(1)} term saved!`);
            // loadSavedData(ocId);
        } catch (err) {
            toast.error(`Failed to save ${termKey}`);
        } finally {
            setIsSaving(false);
        }
    }, [activeTab, getValues, selectedCadet?.ocId, upsertMotivationRows, upsertSportsRows, safeSetSavedData, reset, mergePrefillWithSaved, mergeMotivationWithSaved, savedData, loadSavedData]);


    const handleRowUpdated = useCallback((term: keyof SemesterData, updatedRow: Row) => {
        safeSetSavedData(prev => {
            const copy = prev.map(s => ({ spring: [...s.spring], autumn: [...s.autumn], motivation: [...s.motivation] }));
            copy[activeTab] = { ...copy[activeTab], [term]: copy[activeTab][term].map(r => r.id === updatedRow.id ? updatedRow : r) as any };
            return copy;
        });
    }, [activeTab, safeSetSavedData]);

    const handleRowDeleted = useCallback((term: keyof SemesterData, id: string) => {
        safeSetSavedData(prev => {
            const copy = prev.map(s => ({ spring: [...s.spring], autumn: [...s.autumn], motivation: [...s.motivation] }));
            copy[activeTab] = { ...copy[activeTab], [term]: copy[activeTab][term].filter(r => r.id !== id) as any };
            return copy;
        });
    }, [activeTab, safeSetSavedData]);




    const memoizedSpringRows = useMemo(() => springPrefill, []);
    const memoizedAutumnRows = useMemo(() => autumnPrefill, []);
    const memoizedMotivationRows = useMemo(() => motivationPrefill, []);

    const memoizedSavedSpringRows = useMemo(() => savedData[activeTab]?.spring ?? [], [savedData, activeTab]);
    const memoizedSavedAutumnRows = useMemo(() => savedData[activeTab]?.autumn ?? [], [savedData, activeTab]);
    const memoizedSavedMotivationRows = useMemo(() => savedData[activeTab]?.motivation ?? [], [savedData, activeTab]);



    return (
        <DashboardLayout title="Assessment: Sports / Games & Motivation Awards" description="Enter marks for sports and motivation awards.">
            <main className="p-6">
                <BreadcrumbNav paths={[{ label: "Dashboard", href: "/dashboard" }, { label: "Dossier", href: "/dashboard/milmgmt" }, { label: "Sports - Games Assessment" }]} />

                {selectedCadet && <div className="hidden md:flex sticky top-16 z-40 mb-6"><SelectedCadetTable selectedCadet={selectedCadet} /></div>}

                <DossierTab tabs={dossierTabs} defaultValue="sports-awards" extraTabs={
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><TabsTrigger value="miltrg" className="flex items-center gap-2"><Shield className="h-4 w-4" /> Mil-Trg <ChevronDown className="h-4 w-4" /></TabsTrigger></DropdownMenuTrigger>
                        <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                            {militaryTrainingCards.map(c => {
                                const { to, color, title } = c;
                                if (!to) return null;
                                return (
                                    <DropdownMenuItem key={to} asChild>
                                        <a href={to} className="flex items-center gap-2"><c.icon className={`h-4 w-4 ${color}`} />{title}</a>
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
                                    {semesters.map((sem, idx) => (
                                        <button key={sem} type="button" onClick={() => setActiveTab(idx)} className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === idx ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}>
                                            {sem}
                                        </button>
                                    ))}
                                </div>

                                {/* SPRING */}
                                <div role="form">
                                    <SportsGamesTableAny title="SPRING TERM" termKey="spring" rows={memoizedSpringRows} savedRows={memoizedSavedSpringRows} register={register} disabled={!editing.spring} onRowUpdated={handleRowUpdated} onRowDeleted={handleRowDeleted} />
                                    <div className="flex justify-center gap-3 mt-6">
                                        {editing.spring ? (
                                            <>
                                                <Button type="button" className="bg-green-600" onClick={handleSubmit(() => submitTerm("spring"))} disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</Button>
                                                <Button type="button" variant="outline" onClick={async () => { if (!selectedCadet?.ocId) return; await loadSavedData(selectedCadet.ocId); setEditing(s => ({ ...s, spring: false })); }} disabled={isSaving}>Cancel Edit</Button>
                                                <Button type="button" variant="outline" onClick={() => reset({ spring: springPrefill })} disabled={isSaving}>Reset</Button>
                                            </>
                                        ) : (
                                            <Button type="button" onClick={() => setEditing(s => ({ ...s, spring: true }))} disabled={isSaving}>Edit Spring Table</Button>
                                        )}
                                    </div>
                                </div>

                                {/* AUTUMN */}
                                <div role="form">
                                    <SportsGamesTableAny title="AUTUMN TERM" termKey="autumn" rows={memoizedAutumnRows} savedRows={memoizedSavedAutumnRows} register={register} disabled={!editing.autumn} onRowUpdated={handleRowUpdated} onRowDeleted={handleRowDeleted} />
                                    <div className="flex justify-center gap-3 mt-6">
                                        {editing.autumn ? (
                                            <>
                                                <Button type="button" className="bg-green-600" onClick={handleSubmit(() => submitTerm("autumn"))} disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</Button>
                                                <Button type="button" variant="outline" onClick={async () => { if (!selectedCadet?.ocId) return; await loadSavedData(selectedCadet.ocId); setEditing(s => ({ ...s, autumn: false })); }} disabled={isSaving}>Cancel Edit</Button>
                                                <Button type="button" variant="outline" onClick={() => reset({ autumn: autumnPrefill })} disabled={isSaving}>Reset</Button>
                                            </>
                                        ) : (
                                            <Button type="button" onClick={() => setEditing(s => ({ ...s, autumn: true }))} disabled={isSaving}>Edit Autumn Table</Button>
                                        )}
                                    </div>
                                </div>

                                {/* MOTIVATION */}
                                <div role="form">
                                    <SportsGamesTableAny title="MOTIVATION AWARDS" termKey="motivation" rows={memoizedMotivationRows} savedRows={memoizedSavedMotivationRows} register={register} disabled={!editing.motivation} onRowUpdated={handleRowUpdated} onRowDeleted={handleRowDeleted} />
                                    <div className="flex justify-center gap-3 mt-6">
                                        {editing.motivation ? (
                                            <>
                                                <Button type="button" className="bg-green-600" onClick={handleSubmit(() => submitTerm("motivation"))} disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</Button>
                                                <Button type="button" variant="outline" onClick={async () => { if (!selectedCadet?.ocId) return; await loadSavedData(selectedCadet.ocId); setEditing(s => ({ ...s, motivation: false })); }} disabled={isSaving}>Cancel Edit</Button>
                                                <Button type="button" variant="outline" onClick={() => {
                                                    reset({
                                                        motivation: motivationPrefill.map(row => ({
                                                            ...row,
                                                            obtained: row.obtained || "-",   // ensure hyphen
                                                            maxMarks: row.maxMarks ?? 0,
                                                            string: row.string || "-"
                                                        }))
                                                    })
                                                }} disabled={isSaving}>Reset</Button>
                                            </>
                                        ) : (
                                            <Button type="button" onClick={() => setEditing(s => ({ ...s, motivation: true }))} disabled={isSaving}>Edit Motivation Table</Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}
