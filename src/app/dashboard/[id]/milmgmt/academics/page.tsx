"use client";

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import AcademicsTabs from "@/components/academics/AcademicsTabs";
import { useParams } from "next/navigation";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { useOcDetails } from "@/hooks/useOcDetails";
import DossierTab from "@/components/Tabs/DossierTab";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { ChevronDown, Shield } from "lucide-react";

export default function AcademicsPage() {
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id || "";

    const { cadet } = useOcDetails(ocId);

    const {
        name = "",
        courseName = "",
        ocNumber = "",
        ocId: cadetOcId = ocId,
        course = "", // This is the courseId we need
    } = cadet || {};

    const selectedCadet = { name, courseName, ocNumber, ocId: cadetOcId, course };

    // If no course data yet, show loading
    if (!course) {
        return (
            <DashboardLayout title="Academics" description="Term-wise academic records">
                <main className="p-6">
                    <div className="text-center p-4">Loading cadet information...</div>
                </main>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Academics" description="Term-wise academic records">
            <main className="p-6">
                <BreadcrumbNav paths={[{ label: "Dashboard", href: "/dashboard" }, { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` }, { label: "Academics" }]} />

                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}
                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="academics"
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
                        <AcademicsTabs ocId={ocId} courseId={course} />
                    </div>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}
