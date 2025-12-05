"use client";

import { useParams } from "next/navigation";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { Shield, ChevronDown, Link } from "lucide-react";

import MedicalInfoSection from "@/components/medical/MedicalInfoSection";
import MedicalCategorySection from "@/components/medical/MedicalCategorySection";

import { useOcPersonal } from "@/hooks/useOcPersonal";

export default function MedicalRecordsPage() {
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";

    const { cadet } = useOcPersonal(ocId);

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

    const semesters = [
        "I TERM",
        "II TERM",
        "III TERM",
        "IV TERM",
        "V TERM",
        "VI TERM",
    ];

    return (
        <DashboardLayout
            title="Medical Records"
            description="Maintain and review cadet medical history, examinations, and health records."
        >
            <main className="p-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` },
                        { label: "Medical Records" },
                    ]}
                />

                {cadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-4">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="med-record"
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
                        <Tabs defaultValue="med-info">
                            <TabsList className="grid w-full grid-cols-2 sticky top-[11rem] z-30">
                                <TabsTrigger value="med-info">Medical Info</TabsTrigger>
                                <TabsTrigger value="med-cat">Medical CAT</TabsTrigger>
                            </TabsList>

                            <TabsContent value="med-info">
                                <MedicalInfoSection
                                    selectedCadet={selectedCadet}
                                    semesters={semesters}
                                />
                            </TabsContent>

                            <TabsContent value="med-cat">
                                <MedicalCategorySection
                                    selectedCadet={selectedCadet}
                                    semesters={semesters}
                                />
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