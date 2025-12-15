"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useOcDetails } from "@/hooks/useOcDetails";
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
import { Shield, ChevronDown } from "lucide-react";
import { TabsTrigger } from "@/components/ui/tabs";
import OlqAssessment from "@/components/overall_assessment/OlqAssessment";



export default function OverallAssessmentPage() {

    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";
    const { cadet } = useOcDetails(ocId);




    return (
        <DashboardLayout
            title="Overall Assessment"
            description="Record and manage cadet overall assessment details."
        >
            <main className="p-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` },
                        { label: "Overall Assessment" },
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
                    defaultValue="overall-assessment"
                    ocId={ocId}
                    extraTabs={
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <TabsTrigger value="miltrg" className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" /> Mil-Trg
                                    <ChevronDown className="h-4 w-4" />
                                </TabsTrigger>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                                {militaryTrainingCards.map((card) => {
                                    const { to, color, title } = card;
                                    if (!to) return null;
                                    const href = to(ocId);
                                    return (
                                        <DropdownMenuItem key={title} asChild>
                                            <a href={href} className="flex items-center gap-2">
                                                <card.icon className={`h-4 w-4 ${color}`} />
                                                <span>{title}</span>
                                            </a>
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    }
                >
                    <OlqAssessment />
                </DossierTab>

            </main>
        </DashboardLayout>
    );
}