"use client";

import { useEffect } from "react";
import {
    useForm,
    useFieldArray,
    FormProvider,
    useFormContext
} from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

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

import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { Shield, ChevronDown } from "lucide-react";
import DossierTab from "@/components/Tabs/DossierTab";

export default function ClubDetailsAndDrillPage() {
    const selectedCadet = useSelector((s: RootState) => s.cadet.selectedCadet);

    const methods = useForm<FormValues>({
        defaultValues: {
            clubRows: defaultClubRows,
            drillRows: defaultDrillRows,
            achievements: [{ id: null, achievement: "" }]
        }
    });

    return (
        <DashboardLayout
            title="Assessment: Club Details & Drill"
            description="Maintain cadet’s club involvement and drill performance records."
        >
            <main className="flex-1 p-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: "/dashboard/milmgmt" },
                        { label: "Club Details" }
                    ]}
                />

                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                <FormProvider {...methods}>
                    <InnerClubDrillPage selectedCadet={selectedCadet} />
                </FormProvider>
            </main>
        </DashboardLayout>
    );
}

function InnerClubDrillPage({
    selectedCadet,
}: {
    selectedCadet: RootState['cadet']['selectedCadet'];
}) {
    const {
        control,
        register,
        getValues,
        reset,
        setValue,
        handleSubmit
    } = useFormContext<FormValues>();

    /* Field arrays */
    const { fields: clubFields } = useFieldArray({ control, name: "clubRows" });
    const { fields: drillFields } = useFieldArray({ control, name: "drillRows" });
    const { fields: achievementFields, append, remove } = useFieldArray({
        control,
        name: "achievements"
    });

    /* Action hooks */
    const { submitClub, fetchClub } = useClubActions(selectedCadet);
    const { submitDrill, fetchDrill } = useDrillActions(selectedCadet);
    const { submitAchievements, fetchAchievements, deleteAchievement } = useAchievementActions(selectedCadet);

    useEffect(() => {
        if (!selectedCadet) return;

        // --- CLUB ---
        fetchClub().then((items) => {
            if (!items) return;

            const mapped = defaultClubRows.map(row => {
                const found = items.find((x: any) => x.semester === romanToNumber[row.semester]);
                return {
                    id: found?.id ?? null,
                    semester: row.semester,
                    clubName: found?.clubName ?? "",
                    splAchievement: found?.specialAchievement ?? "",
                    remarks: found?.remark ?? ""
                };
            });

            setValue("clubRows", mapped);
        });

        fetchDrill().then((items) => {
            if (!items) return;

            const mapped = defaultDrillRows.map(row => {
                const api = items.find((x: any) => x.semester === romanToNumber[row.semester]);
                return {
                    id: api?.id ?? undefined,
                    semester: row.semester,
                    maxMks: (api?.maxMarks ?? "") as number | "",
                    m1: (api?.m1Marks ?? "") as number | "",
                    m2: (api?.m2Marks ?? "") as number | "",
                    a1c1: (api?.a1c1Marks ?? "") as number | "",
                    a2c2: (api?.a2c2Marks ?? "") as number | "",
                    remarks: api?.remark ?? ""
                };
            });

            setValue("drillRows", mapped);
        });

        fetchAchievements().then((rows) => {
            setValue("achievements", rows.length ? rows : [{ id: null, achievement: "" }]);
        });

    }, [selectedCadet]);

    return (
        <DossierTab
            tabs={dossierTabs}
            defaultValue="club-detls"
            extraTabs={
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <TabsTrigger value="miltrg" className="flex items-center gap-2">
                            <Shield className="h-4 w-4" /> Mil-Trg
                            <ChevronDown className="h-4 w-4" />
                        </TabsTrigger>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                        {militaryTrainingCards.map(card => (
                            <DropdownMenuItem key={card.to} asChild>
                                <a href={card.to} className="flex items-center gap-2">
                                    <card.icon className={`h-4 w-4 ${card.color}`} />
                                    {card.title}
                                </a>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            }
        >
            <TabsContent value="club-detls" className="space-y-6">
                <Card className="max-w-5xl mx-auto p-6 shadow-lg rounded-2xl bg-white">
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
                            onSubmit={handleSubmit(submitClub)}
                            onReset={() =>
                                reset({ ...getValues(), clubRows: defaultClubRows })
                            }
                        />

                        {/* DRILL FORM */}
                        <DrillForm
                            register={register}
                            fields={drillFields}
                            onSubmit={handleSubmit(submitDrill)}
                            onReset={() =>
                                reset({ ...getValues(), drillRows: defaultDrillRows })
                            }
                        />

                        {/* ACHIEVEMENTS FORM */}
                        <AchievementsForm
                            register={register}
                            fields={achievementFields}
                            append={append}
                            remove={remove}
                            onSubmit={handleSubmit(submitAchievements)}
                            onReset={() =>
                                reset({ ...getValues(), achievements: [] })
                            }
                            onDeleteRow={(index: number) => deleteAchievement(index, remove)}
                        />

                    </CardContent>
                </Card>
            </TabsContent>
        </DossierTab>
    );
}
