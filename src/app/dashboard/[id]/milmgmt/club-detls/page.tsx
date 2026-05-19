"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    useForm,
    useFieldArray,
    FormProvider,
    useFormContext
} from "react-hook-form";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import {
    defaultClubRows,
    defaultDrillRows,
    romanToNumber
} from "@/constants/app.constants";

import { dossierTabs, militaryTrainingCards } from "@/config/app.config";

import { FormValues } from "@/types/club-detls";

import { useClubActions } from "@/hooks/useClubActions";
import { useDrillActions } from "@/hooks/useDrillActions";
import { useAchievementActions } from "@/hooks/useAchievementActions";

import AchievementsForm from "@/components/club_drill/AchievementsForm";
import DrillForm from "@/components/club_drill/DrillForm";
import ClubForm from "@/components/club_drill/ClubForm";

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem
} from "@/components/ui/dropdown-menu";

import { TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { Shield, ChevronDown } from "lucide-react";
import DossierTab from "@/components/Tabs/DossierTab";
import { useOcDetails } from "@/hooks/useOcDetails";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Cadet } from "@/types/cadet";
import { calculateDrillTotals } from "@/utils/drillTotals";

const EMPTY = "" as const;

export default function ClubDetailsAndDrillPage() {
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

    const methods = useForm<FormValues>({
        defaultValues: {
            clubRows: defaultClubRows,
            drillRows: defaultDrillRows,
            achievements: [{ id: null, achievement: "" }]
        }
    });

    return (
        <DashboardLayout
            title="Assessment: Club and Drill Details"
            description="Maintain cadet’s club involvement and drill performance records."
        >
            <main className="flex-1 p-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: `/dashboard/${id}/milmgmt` },
                        { label: "Club and Drill Details" }
                    ]}
                />

                {cadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                <FormProvider {...methods}>
                    <InnerClubDrillPage selectedCadet={selectedCadet} ocId={ocId} />
                </FormProvider>
            </main>
        </DashboardLayout>
    );
}

function InnerClubDrillPage({
    selectedCadet,
    ocId,
}: {
    selectedCadet: Cadet;
    ocId: string;
}) {
    const [isClubEditing, setIsClubEditing] = useState(false);
    const [isDrillEditing, setIsDrillEditing] = useState(false);
    const [isAchievementsEditing, setIsAchievementsEditing] = useState(false);
    const loadedOcIdRef = useRef<string | null>(null);
    const lastClubRowsRef = useRef<FormValues["clubRows"]>(
        defaultClubRows.map((row) => ({ ...row }))
    );
    const lastDrillRowsRef = useRef<FormValues["drillRows"]>(
        defaultDrillRows.map((row) => ({ ...row }))
    );
    const lastAchievementRowsRef = useRef<FormValues["achievements"]>([
        { id: null, achievement: "" }
    ]);

    const {
        control,
        register,
        handleSubmit
    } = useFormContext<FormValues>();

    /* Field arrays */
    const { fields: clubFields, replace: replaceClubRows } = useFieldArray({
        control,
        name: "clubRows",
        keyName: "fieldId",
    });
    const { fields: drillFields, replace: replaceDrillRows } = useFieldArray({
        control,
        name: "drillRows",
        keyName: "fieldId",
    });
    const { fields: achievementFields, append, remove, replace: replaceAchievementRows } = useFieldArray({
        control,
        name: "achievements",
        keyName: "fieldId",
    });

    /* Action hooks */
    const { submitClub, fetchClub } = useClubActions(selectedCadet);
    const { submitDrill, fetchDrill } = useDrillActions(selectedCadet);
    const { submitAchievements, fetchAchievements, deleteAchievement } = useAchievementActions(selectedCadet);

    const loadRecords = useCallback(async () => {
        if (!selectedCadet?.ocId) return;

        const [clubResult, drillResult, achievementResult] = await Promise.allSettled([
            fetchClub(),
            fetchDrill(),
            fetchAchievements(),
        ]);
        if (clubResult.status === "fulfilled") {
            const clubItems = clubResult.value;
            const mapped = defaultClubRows.map(row => {
                const found = clubItems.find((x: any) => Number(x.semester) === romanToNumber[row.semester]);
                const { clubName, specialAchievement, remark, id } = found || {};
                return {
                    id: id ?? null,
                    semester: row.semester,
                    clubName: clubName ?? "",
                    splAchievement: specialAchievement ?? "",
                    remarks: remark ?? ""
                };
            });

            lastClubRowsRef.current = mapped.map((row) => ({ ...row }));
            replaceClubRows(lastClubRowsRef.current.map((row) => ({ ...row })));
        }

        if (drillResult.status === "fulfilled") {
            const drillItems = drillResult.value;
            const mapped = defaultDrillRows.map(row => {
                const numSemester = romanToNumber[row.semester];
                const api = drillItems.find((x: any) => Number(x.semester) === numSemester);

                const {
                    id,
                    maxMarks,
                    m1Marks,
                    m2Marks,
                    a1c1Marks,
                    a2c2Marks,
                    remark
                } = api || {};

                return {
                    id: id ?? undefined,
                    semester: row.semester,

                    maxMks: maxMarks != null ? Number(maxMarks) : row.maxMks,
                    m1: m1Marks != null ? Number(m1Marks) : EMPTY,
                    m2: m2Marks != null ? Number(m2Marks) : EMPTY,
                    a1c1: a1c1Marks != null ? Number(a1c1Marks) : EMPTY,
                    a2c2: a2c2Marks != null ? Number(a2c2Marks) : EMPTY,

                    remarks: remark ?? ""
                };
            });

            const totals = calculateDrillTotals(mapped);
            const mappedWithTotals = mapped.map((row, index) => (
                index === 3 ? { ...row, ...totals, remarks: row.remarks ?? "" } : row
            ));

            lastDrillRowsRef.current = mappedWithTotals.map((row) => ({ ...row }));
            replaceDrillRows(lastDrillRowsRef.current.map((row) => ({ ...row })));
        }

        if (achievementResult.status === "fulfilled") {
            const achievementRows = achievementResult.value;
            const mapped = achievementRows.length
                ? achievementRows.map((row) => ({ id: row.id ?? null, achievement: row.achievement ?? "" }))
                : [{ id: null, achievement: "" }];

            lastAchievementRowsRef.current = mapped.map((row) => ({ ...row }));
            replaceAchievementRows(
                lastAchievementRowsRef.current.map((row) => ({ ...row }))
            );
        }
    }, [selectedCadet?.ocId, fetchClub, fetchDrill, fetchAchievements, replaceClubRows, replaceDrillRows, replaceAchievementRows]);

    useEffect(() => {
        if (!selectedCadet?.ocId || loadedOcIdRef.current === selectedCadet.ocId) {
            return;
        }

        loadedOcIdRef.current = selectedCadet.ocId;
        void loadRecords();
    }, [selectedCadet?.ocId, loadRecords]);

    const saveClub = handleSubmit(async () => {
        if (await submitClub()) {
            await loadRecords();
            setIsClubEditing(false);
        }
    });

    const saveDrill = handleSubmit(async () => {
        if (await submitDrill()) {
            await loadRecords();
            setIsDrillEditing(false);
        }
    });

    const saveAchievements = handleSubmit(async () => {
        if (await submitAchievements()) {
            await loadRecords();
            setIsAchievementsEditing(false);
        }
    });

    const cancelClubEdit = () => {
        replaceClubRows(lastClubRowsRef.current.map((row) => ({ ...row })));
        setIsClubEditing(false);
    };

    const cancelDrillEdit = () => {
        replaceDrillRows(lastDrillRowsRef.current.map((row) => ({ ...row })));
        setIsDrillEditing(false);
    };

    const cancelAchievementsEdit = () => {
        replaceAchievementRows(lastAchievementRowsRef.current.map((row) => ({ ...row })));
        setIsAchievementsEditing(false);
    };

    return (
        <DossierTab
            tabs={dossierTabs}
            defaultValue="club-detls"
            ocId={ocId}
            extraTabs={
                <DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Mil-Trg
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
                </DropdownMenu>
            }
        >
            <TabsContent value="club-detls" className="space-y-6">
                <Card className="max-w-5xl mx-auto p-6 shadow-lg rounded-2xl bg-card">
                    <CardHeader>
                        <CardTitle className="text-center text-primary font-bold">
                            CLUB DETAILS & DRILL ASSESSMENT
                        </CardTitle>
                    </CardHeader>

                    <CardContent>

                        {/* CLUB FORM */}
                        <ClubForm
                            register={register}
                            fields={clubFields}
                            disabled={!isClubEditing}
                            onEdit={() => setIsClubEditing(true)}
                            onSubmit={saveClub}
                            onReset={cancelClubEdit}
                        />

                        {/* DRILL FORM */}
                        <DrillForm
                            register={register}
                            fields={drillFields}
                            disabled={!isDrillEditing}
                            onEdit={() => setIsDrillEditing(true)}
                            onSubmit={saveDrill}
                            onReset={cancelDrillEdit}
                        />

                        {/* ACHIEVEMENTS FORM */}
                        <AchievementsForm
                            register={register}
                            fields={achievementFields}
                            append={append}
                            remove={remove}
                            disabled={!isAchievementsEditing}
                            onEdit={() => setIsAchievementsEditing(true)}
                            onSubmit={saveAchievements}
                            onReset={cancelAchievementsEdit}
                            onDeleteRow={(index: number) => deleteAchievement(index, remove)}
                        />

                    </CardContent>
                </Card>
            </TabsContent>
        </DossierTab>
    );
}
