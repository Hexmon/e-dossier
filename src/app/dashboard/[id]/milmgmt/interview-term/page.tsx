"use client";

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import InterviewTermTabs from "@/components/interview-term/InterviewTermTabs";
import { useParams } from "next/navigation";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { useOcDetails } from "@/hooks/useOcDetails";
import DossierTab from "@/components/Tabs/DossierTab";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { ChevronDown, Shield } from "lucide-react";

export default function InterviewTermPage() {
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";

    const { cadet } = useOcDetails(ocId);

    const {
        name = "",
        courseName = "",
        ocNumber = "",
        ocId: cadetOcId = ocId,
        course = "",
    } = cadet ?? {};

    const selectedCadet = { name, courseName, ocNumber, ocId: cadetOcId, course };

    return (
        <DashboardLayout title="Interview - Term" description="Term-wise interview forms">
            <main className="p-6">
                <BreadcrumbNav paths={[{ label: "Dashboard", href: "/dashboard" }, { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` }, { label: "Interview Term" }]} />

                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}
                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="interview-term"
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
                >
                    <div>
                        <InterviewTermTabs />
                    </div>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}
