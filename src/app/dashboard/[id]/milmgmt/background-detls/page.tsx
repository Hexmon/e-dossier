// app/dashboard/[id]/milmgmt/background-detls/page.tsx
"use client";

import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shield, ChevronDown } from "lucide-react";

import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { Tabs, TabsContent, TabsTrigger, TabsList } from "@/components/ui/tabs";

import FamilyBackground from "@/components/background/FamilyBackground";
import EducationQualifications from "@/components/background/EducationQualifications";
import AchievementsSection from "@/components/background/AchievementsSection";
import AutobiographySection from "@/components/background/AutobiographySection";

import { useOcPersonal } from "@/hooks/useOcPersonal";
import Link from "next/link";

export default function BackgroundDetlsPage() {
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";

    const { cadet } = useOcPersonal(ocId);

    return (
        <DashboardLayout
            title="Background Details"
            description="Maintain and review cadets' background information, including family, education, and prior experiences."
        >
            <main className="flex-1 p-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` },
                        { label: "Background Details" },
                    ]}
                />

                {cadet && (
                    <SelectedCadetTable
                        selectedCadet={{
                            name: cadet.name ?? "",
                            courseName: cadet.courseName ?? "",
                            ocNumber: cadet.ocNumber ?? "",
                            ocId: cadet.ocId ?? "",
                            course: cadet.course ?? "",
                        }}
                    />
                )}

                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="background-detls"
                    ocId={ocId}
                    extraTabs={
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
                    }
                    nestedTabs={
                        <Tabs defaultValue="family-bgrnd">
                            <TabsList className="grid grid-cols-4 sticky top-[11.5rem] z-30 w-full mb-2">
                                <TabsTrigger value="family-bgrnd">Family Background</TabsTrigger>
                                <TabsTrigger value="edn-qlf">Educational Qualification</TabsTrigger>
                                <TabsTrigger value="achievements">Achievements</TabsTrigger>
                                <TabsTrigger value="auto-bio">Autobiography</TabsTrigger>
                            </TabsList>

                            <TabsContent value="family-bgrnd">
                                <FamilyBackground ocId={ocId} cadet={cadet} />
                            </TabsContent>

                            <TabsContent value="edn-qlf">
                                <EducationQualifications ocId={ocId} cadet={cadet} />
                            </TabsContent>

                            <TabsContent value="achievements">
                                <AchievementsSection ocId={ocId} />
                            </TabsContent>

                            <TabsContent value="auto-bio">
                                <AutobiographySection ocId={ocId} cadet={cadet} />
                            </TabsContent>
                        </Tabs>
                    }
                >
                    <></>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}
