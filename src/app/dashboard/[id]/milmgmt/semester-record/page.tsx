"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import SemesterForm from "@/components/semester-record/semesterForm";
import { useOcDetails } from "@/hooks/useOcDetails";
import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Settings, Shield } from "lucide-react";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";

export default function SemesterRecordPage() {
    const params = useParams();
    // Handle both 'id' and 'ocId' param names, similar to your working file
    const paramId = params?.ocId || params?.id;
    const ocId = Array.isArray(paramId) ? paramId[0] : paramId ?? "";

    const { cadet, loading: loadingCadet } = useOcDetails(ocId);

    return (
        <DashboardLayout
            title="Semester Record"
            description="Record and manage cadet performance across semesters."
        >
            <main className="p-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` },
                        { label: "Semester Record" },
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
                    defaultValue="semester-record"
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

                    <TabsContent value="semester-record">
                        <Card className="max-w-6xl mx-auto p-6 rounded-2xl shadow-xl bg-card">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-center text-primary">
                                    SEMESTER RECORD
                                </CardTitle>
                            </CardHeader>
                            <SemesterForm />
                        </Card>
                    </TabsContent>
                </DossierTab>



            </main>
        </DashboardLayout>
    );
}
