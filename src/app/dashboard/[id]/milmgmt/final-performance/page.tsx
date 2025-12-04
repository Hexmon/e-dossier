"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Shield } from "lucide-react";
import { useOcDetails } from "@/hooks/useOcDetails";
import FinalPerformanceRecord from "@/components/finalPerformance/FinalPerformanceRecord";

export default function FinalPerformancePage() {
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";

    const { cadet, loading: loadingCadet } = useOcDetails(ocId);

    return (
        <DashboardLayout
            title="Final Performance"
            description="Record and manage cadet final performance details."
        >
            <main className="p-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` },
                        { label: "Final Performance" },
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
                    defaultValue="final-performance"
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
                                    return (
                                        <DropdownMenuItem key={to} asChild>
                                            <a href={to} className="flex items-center gap-2">
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

                    <FinalPerformanceRecord />

                </DossierTab>


            </main>
        </DashboardLayout>
    );
}
