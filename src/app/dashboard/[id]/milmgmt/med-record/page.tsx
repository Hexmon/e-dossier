"use client";

import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import DossierTab from "@/components/Tabs/DossierTab";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Shield, ChevronDown } from "lucide-react";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";

import MedicalInfoSection from "@/components/medical/MedicalInfoSection";
import MedicalCategorySection from "@/components/medical/MedicalCategorySection";

export default function MedicalRecordsPage() {
    const router = useRouter();
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);

    const semesters = ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];

    return (
        <DashboardLayout
            title="Medical Records"
            description="Maintain and review cadet medical history, examinations, and health records."
        >
            <main className="p-6">
                {/* Breadcrumb */}
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: "/dashboard/milmgmt" },
                        { label: "Medical Records" },
                    ]}
                />

                {/* Selected Cadet */}
                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-4">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                {/* Dossier Tabs */}
                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="med-record"
                    extraTabs={
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <TabsTrigger value="med-record" className="flex items-center gap-2">
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
                        <Tabs defaultValue="med-info">
                            <TabsList className="grid w-full grid-cols-2 sticky top-[11rem] z-30">
                                <TabsTrigger value="med-info">Medical Info</TabsTrigger>
                                <TabsTrigger value="med-cat">Medical CAT</TabsTrigger>
                            </TabsList>

                            {/* Medical Info */}
                            <TabsContent value="med-info">
                                <MedicalInfoSection selectedCadet={selectedCadet} semesters={semesters} />
                            </TabsContent>

                            {/* Medical Category */}
                            <TabsContent value="med-cat">
                                <MedicalCategorySection selectedCadet={selectedCadet} semesters={semesters} />
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