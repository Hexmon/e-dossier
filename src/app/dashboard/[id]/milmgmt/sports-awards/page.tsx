"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import SportsGamesTable from "@/components/sports/SportsTable";
import SportsForm from "@/components/sports/SportsForm";

import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Shield, ChevronDown } from "lucide-react";

import { springPrefill, autumnPrefill, motivationPrefill } from "@/constants/app.constants";
import { useSportsAwards } from "@/hooks/useSportsAwards";
import { useCfeRecords } from "@/hooks/useCfeRecords";
import { toast } from "sonner";

import type { Row, SemesterData } from "@/types/sportsAwards";
import { useOcDetails } from "@/hooks/useOcDetails";
import Link from "next/link";
import type { RootState } from "@/store";
import { saveSportsAwardsForm, clearSportsAwardsForm } from "@/store/slices/sportsAwardsSlice";
import { useMe } from "@/hooks/useMe";
import { canBypassDossierSemesterLock } from "@/lib/dossier-semester-access";
import { useDossierSemesterRouting } from "@/hooks/useDossierSemesterRouting";
import SemesterLockNotice from "@/components/dossier/SemesterLockNotice";

const motivationAwardCategories = [
    { activity: "Merit Card", categories: ["Sports Award Merit"] },
    { activity: "Half Blue", categories: ["Sports Award Half-Blue", "Sports Award Half Blue"] },
    { activity: "Blue", categories: ["Sports Award Blue"] },
    { activity: "Blazer", categories: ["Sports Award Blazer"] },
] as const;

function normalizeAwardCategory(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function SportsGamesPage() {
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";

    const { cadet } = useOcDetails(ocId);
    const { data: meData } = useMe();

    const { name = "", courseName = "", ocNumber = "", ocId: cadetOcId = ocId, course = "", currentSemester = 1 } = cadet ?? {};
    const selectedCadet = useMemo(() => ({ name, courseName, ocNumber, ocId: cadetOcId, course, currentSemester }), [name, courseName, ocNumber, cadetOcId, course, currentSemester]);
    const canEditLockedSemesters = canBypassDossierSemesterLock({
        roles: meData?.roles,
        position: meData?.apt?.position ?? null,
    });

    const semesters = useMemo(() => ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"], []);
    const { activeSemester, setActiveSemester, isActiveSemesterLocked, supportedSemesters } = useDossierSemesterRouting({
        currentSemester,
        supportedSemesters: [1, 2, 3, 4, 5, 6],
        canEditLockedSemesters,
    });
    const activeTab = activeSemester - 1;

    const handleSemesterChange = (index: number) => {
        setActiveSemester(index + 1);
    };

    // Redux - must come after activeTab is initialized
    const dispatch = useDispatch();
    const savedFormData = useSelector((state: RootState) =>
        state.sportsAwards.forms[ocId]?.[activeTab + 1]
    );

    // Ref to track last saved data for auto-save optimization
    const lastSavedData = useRef<string>("");

    // hook for saved data / apis
    const {
        savedData,
        loading: loadingSaved,
        loadAll,
        upsertSportsRows,
    } = useSportsAwards(ocId, semesters.length, false);
    const {
        groups: cfeGroups,
        loading: loadingCfe,
        fetchAll: fetchAllCfe,
    } = useCfeRecords(ocId, semesters.length);

    const cfeMotivationRows = useMemo<Row[]>(() => {
        const rows = cfeGroups[activeTab] ?? [];

        return motivationAwardCategories.map(({ activity, categories }) => {
            const categorySet = new Set(categories.map(normalizeAwardCategory));
            const awardCount = rows.filter((row) =>
                categorySet.has(normalizeAwardCategory(row.cat ?? ""))
            ).length;

            return {
                activity,
                string: "",
                maxMarks: "",
                obtained: String(awardCount),
            };
        });
    }, [activeTab, cfeGroups]);

    // helpers to merge prefill with saved rows (keeps prefill order)
    const mergePrefillWithSaved = (prefill: Row[], saved: Row[]) =>
        prefill.map((p) => {
            const { activity } = p;
            const found = saved.find((s) => s.activity === activity);
            return found
                ? { 
                    id: found.id,
                    ocId: found.ocId,
                    term: found.term,
                    activity: found.activity ?? activity, 
                    string: found.string ?? p.string ?? "", 
                    maxMarks: found.maxMarks ?? p.maxMarks ?? "", 
                    obtained: found.obtained ?? p.obtained ?? "" 
                }
                : { 
                    id: p.id,
                    ocId: p.ocId,
                    term: p.term,
                    activity: p.activity ?? "-",
                    string: p.string ?? "", 
                    maxMarks: p.maxMarks ?? "", 
                    obtained: p.obtained ?? "" 
                };
        });

    // Create stable default values - prioritize Redux cache over database
    const getDefaultValues = useCallback((): SemesterData => {
        // First check Redux cache for this semester
        if (savedFormData) {
            console.log('Using Redux cache data');
            return {
                spring: savedFormData.spring,
                autumn: savedFormData.autumn,
                motivation: cfeMotivationRows,
            };
        }

        // Then check database
        const current = savedData[activeTab];
        if (current) {
            console.log('Using database data');
            return {
                spring: mergePrefillWithSaved(springPrefill, current.spring),
                autumn: mergePrefillWithSaved(autumnPrefill, current.autumn),
                motivation: cfeMotivationRows,
            };
        }

        // Finally use prefill
        console.log('Using prefill data');
        return {
            spring: springPrefill,
            autumn: autumnPrefill,
            motivation: cfeMotivationRows,
        };
    }, [savedFormData, savedData, activeTab, cfeMotivationRows]);

    // form - use a key to force remount when switching tabs
    const { control, handleSubmit, reset, getValues, watch, formState, setValue } = useForm<SemesterData>({
        mode: "onChange",
        defaultValues: getDefaultValues(),
    });

    const [isSaving, setIsSaving] = useState(false);
    const [editing, setEditing] = useState({ spring: false, autumn: false, motivation: false });

    // Log form state for debugging
    useEffect(() => {
        console.log('Form values:', getValues());
    }, [formState, getValues]);

    useEffect(() => {
        if (!ocId) return;
        loadAll();
        fetchAllCfe();
    }, [ocId, loadAll, fetchAllCfe]);

    // Reset form only when activeTab changes
    useEffect(() => {
        const newValues = getDefaultValues();
        console.log('Resetting form with:', newValues);
        reset(newValues);
    }, [activeTab, reset, getDefaultValues]);

    useEffect(() => {
        setValue("motivation", cfeMotivationRows, { shouldDirty: false });
    }, [cfeMotivationRows, setValue]);

    // Auto-save to Redux on form changes with debouncing
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        
        const subscription = watch((value) => {
            if (!ocId || !value.spring || !value.autumn || !value.motivation) return;

            // Clear existing timeout
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            // Debounce the save operation
            timeoutId = setTimeout(() => {
                const formData: SemesterData = {
                    spring: value.spring as Row[],
                    autumn: value.autumn as Row[],
                    motivation: value.motivation as Row[],
                };

                // Compare stringified data to avoid unnecessary dispatches
                const currentData = JSON.stringify(formData);
                if (currentData !== lastSavedData.current) {
                    console.log('Auto-saving to Redux:', formData);
                    lastSavedData.current = currentData;
                    dispatch(saveSportsAwardsForm({
                        ocId,
                        semester: activeTab + 1,
                        data: formData,
                    }));
                }
            }, 500); // Increased to 500ms debounce
        });

        return () => {
            subscription.unsubscribe();
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [watch, dispatch, ocId, activeTab]);

    // Update lastSavedData when activeTab changes
    useEffect(() => {
        const defaultVals = getDefaultValues();
        lastSavedData.current = JSON.stringify(defaultVals);
    }, [activeTab]);

    // Validation helper
    const validateTermRows = (rows: Row[], isMotivation: boolean = false): boolean => {
        for (const r of rows) {
            const obtained = Number(r?.obtained ?? 0);
            const maxMarks = Number(r?.maxMarks ?? 0);

            // Validate obtained marks is not negative
            if (!Number.isNaN(obtained) && obtained < 0) {
                toast.error("Obtained marks cannot be negative");
                return false;
            }

            // Validate obtained <= maxMarks (only for sports, not motivation)
            if (!isMotivation && !Number.isNaN(maxMarks) && !Number.isNaN(obtained) && obtained > maxMarks) {
                toast.error("Obtained marks cannot exceed Max Marks");
                return false;
            }
        }
        return true;
    };

    // submit a term
    const submitTerm = async (termKey: "spring" | "autumn" | "motivation") => {
        if (!ocId) {
            toast.error("No cadet selected");
            return;
        }
        const semesterNumber = activeTab + 1;
        const rows: Row[] = getValues(termKey) ?? [];
        if (termKey === "motivation") return;

        // Validate rows
        if (!validateTermRows(rows)) {
            return;
        }

        setIsSaving(true);
        try {
            await upsertSportsRows(semesterNumber, termKey, rows);

            toast.success(`${termKey.charAt(0).toUpperCase() + termKey.slice(1)} term saved successfully`);
            await loadAll();
            
            // Clear Redux cache for this semester after successful save
            dispatch(clearSportsAwardsForm({ ocId, semester: semesterNumber }));
            
            setEditing((s) => ({ ...s, [termKey]: false }));
        } catch (err) {
            console.error(err);
            toast.error("Failed to save term");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = async (termKey: "spring" | "autumn" | "motivation") => {
        if (!ocId) return;
        
        // Clear Redux cache and reload from database
        dispatch(clearSportsAwardsForm({ ocId, semester: activeTab + 1 }));
        await loadAll();
        
        setEditing((s) => ({ ...s, [termKey]: false }));
    };

    const handleReset = (termKey: "spring" | "autumn" | "motivation") => {
        const resetData: SemesterData = {
            spring: termKey === "spring" ? springPrefill : getValues("spring"),
            autumn: termKey === "autumn" ? autumnPrefill : getValues("autumn"),
            motivation: termKey === "motivation" ? motivationPrefill : getValues("motivation"),
        };

        reset(resetData);
        
        // Update Redux cache
        dispatch(saveSportsAwardsForm({
            ocId,
            semester: activeTab + 1,
            data: resetData,
        }));
    };

    // memoized rows to pass to table (prefill + saved)
    const memoizedSpringRows = useMemo(() => springPrefill, []);
    const memoizedAutumnRows = useMemo(() => autumnPrefill, []);
    const memoSavedSpring = useMemo(() => savedData[activeTab]?.spring ?? [], [savedData, activeTab]);
    const memoSavedAutumn = useMemo(() => savedData[activeTab]?.autumn ?? [], [savedData, activeTab]);

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
                        <Card className="max-w-6xl mx-auto p-6 rounded-2xl shadow-xl bg-card">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-center text-primary">
                                    SPORTS / GAMES ASSESSMENT & MOTIVATION AWARDS
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <SemesterLockNotice
                                        activeSemester={activeSemester}
                                        currentSemester={currentSemester ?? 1}
                                        supportedSemesters={supportedSemesters}
                                    canOverrideLockedSemester={canEditLockedSemesters}
                                    />
                                <div className="flex justify-center mb-6 space-x-2">
                                    {semesters.map((sem, idx) => {
                                        return (
                                            <button key={sem} type="button" onClick={() => handleSemesterChange(idx)} className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === idx ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
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
                                        control={control}
                                        disabled={isActiveSemesterLocked || !editing.spring}
                                    />
                                    <SportsForm
                                        termKey="spring"
                                        isSaving={isSaving}
                                        editing={editing.spring}
                                        readOnly={isActiveSemesterLocked}
                                        onSave={() => {
                                            if (editing.spring) {
                                                submitTerm("spring");
                                            } else {
                                                setEditing((s) => ({ ...s, spring: true }));
                                            }
                                        }}
                                        onCancel={() => handleCancel("spring")}
                                        onReset={() => handleReset("spring")}
                                    />
                                </div>

                                {/* AUTUMN */}
                                <div role="form">
                                    <SportsGamesTable
                                        title="AUTUMN TERM"
                                        termKey="autumn"
                                        rows={memoizedAutumnRows}
                                        savedRows={memoSavedAutumn}
                                        control={control}
                                        disabled={isActiveSemesterLocked || !editing.autumn}
                                    />
                                    <SportsForm
                                        termKey="autumn"
                                        isSaving={isSaving}
                                        editing={editing.autumn}
                                        readOnly={isActiveSemesterLocked}
                                        onSave={() => {
                                            if (editing.autumn) {
                                                submitTerm("autumn");
                                            } else {
                                                setEditing((s) => ({ ...s, autumn: true }));
                                            }
                                        }}
                                        onCancel={() => handleCancel("autumn")}
                                        onReset={() => handleReset("autumn")}
                                    />
                                </div>

                                {/* MOTIVATION */}
                                <div role="form">
                                    <SportsGamesTable
                                        title="Motivation Awards"
                                        termKey="motivation"
                                        rows={cfeMotivationRows}
                                        savedRows={cfeMotivationRows}
                                        control={control}
                                        disabled={true}
                                        hideStringAndMaxMarks={true}
                                    />
                                    {loadingCfe ? (
                                        <p className="text-sm text-muted-foreground text-center -mt-6 mb-6">
                                            Loading motivation awards from CFE...
                                        </p>
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
