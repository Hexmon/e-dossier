"use client";

import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

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

import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import DossierTab from "@/components/Tabs/DossierTab";

import FamilyBackground from "@/components/background/FamilyBackground";
import EducationQualifications from "@/components/background/EducationQualifications";
import AchievementsSection from "@/components/background/AchievementsSection";
import AutobiographySection from "@/components/background/AutobiographySection";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BackgroundDetlsPage() {
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);

    return (
        <DashboardLayout
            title="Background Details"
            description="Maintain and review cadets' background information, including family, education, and prior experiences."
        >
            <main className="flex-1 p-6">

                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: "/dashboard/milmgmt" },
                        { label: "Background Details" },
                    ]}
                />

                {selectedCadet && <SelectedCadetTable selectedCadet={selectedCadet} />}

                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="background-detls"
                    extraTabs={
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <TabsTrigger value="background-detls" className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    Mil-Trg
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </TabsTrigger>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                                {militaryTrainingCards.map((card) => (
                                    <DropdownMenuItem key={card.to} asChild>
                                        <a href={card.to} className="flex items-center gap-2 w-full">
                                            <card.icon className={`h-4 w-4 ${card.color}`} />
                                            <span>{card.title}</span>
                                        </a>
                                    </DropdownMenuItem>
                                ))}
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
                                <FamilyBackground selectedCadet={selectedCadet} />
                            </TabsContent>

                            <TabsContent value="edn-qlf">
                                <EducationQualifications selectedCadet={selectedCadet} />
                            </TabsContent>

                            <TabsContent value="achievements">
                                <AchievementsSection selectedCadet={selectedCadet} />
                            </TabsContent>

                            <TabsContent value="auto-bio">
                                <AutobiographySection selectedCadet={selectedCadet} />
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
