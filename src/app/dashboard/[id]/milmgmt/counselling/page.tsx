"use client";

import { useEffect, useState } from "react";
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
import { Shield, ChevronDown, Link } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

import { useOcDetails } from "@/hooks/useOcDetails";
import { semestersCounselling } from "@/constants/app.constants";
import { useCounsellingRecords } from "@/hooks/useCounsellingRecords";
import CounsellingTable from "@/components/counselling/CounsellingTable";
import CounsellingForm from "@/components/counselling/CounsellingForm";
import { CounsellingFormData } from "@/types/counselling";

export default function CounsellingWarningPage() {
    // route param
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";

    // cadet data via hook (no redux)
    const { cadet } = useOcDetails(ocId);

    const {
        name = "",
        courseName = "",
        ocNumber = "",
        ocId: cadetOcId = ocId,
        course = "",
    } = cadet ?? {};

    const selectedCadet = { name, courseName, ocNumber, ocId: cadetOcId, course };

    // semesters fallback (use provided constant)
    const semesters =
        Array.isArray(semestersCounselling) && semestersCounselling.length > 0
            ? semestersCounselling
            : ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];

    // Hook for counselling data - pass semesters array instead of count
    const {
        groupedBySemester,
        loading,
        fetchAll,
        saveRecords,
        updateRecord,
        deleteRecord,
    } = useCounsellingRecords(ocId, semesters);

    const [activeTab, setActiveTab] = useState<number>(0);

    useEffect(() => {
        if (!ocId) return;
        fetchAll();
    }, [ocId, fetchAll]);

    const handleSubmit = async (data: CounsellingFormData) => {
        const termLabel = semesters[activeTab] ?? semesters[0];
        await saveRecords(termLabel, data.records);
    };

    const handleEditSave = async (
        idToUpdate: string,
        payload: Partial<{ reason: string; date: string; warningBy: string }>
    ) => {
        await updateRecord(idToUpdate, payload);
    };

    const handleDelete = async (idToDelete: string) => {
        await deleteRecord(idToDelete);
    };

    return (
        <DashboardLayout
            title="Counselling - Warning Record"
            description="Record counselling & warnings across terms."
        >
            <main className="p-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` },
                        { label: "Counselling / Warning Record" },
                    ]}
                />

                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="counselling"
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
                    <TabsContent value="counselling">
                        <section className="p-6">
                            <Card className="max-w-6xl mx-auto p-6 shadow bg-white">
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold text-center">
                                        COUNSELLING / WARNING RECORD : ALL TERMS
                                    </CardTitle>
                                </CardHeader>

                                <CardContent>
                                    <div className="flex justify-center mb-6 space-x-2">
                                        {semesters.map((term, idx) => {
                                            return (
                                                <button
                                                    key={term}
                                                    type="button"
                                                    onClick={() => setActiveTab(idx)}
                                                    className={`px-4 py-2 rounded-t-lg font-medium ${
                                                        activeTab === idx
                                                            ? "bg-blue-600 text-white"
                                                            : "bg-gray-200 text-gray-700"
                                                    }`}
                                                >
                                                    {term}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <CounsellingTable
                                        rows={groupedBySemester[activeTab] ?? []}
                                        loading={loading}
                                        onEditSave={handleEditSave}
                                        onDelete={handleDelete}
                                    />

                                    <div className="mt-6">
                                        <CounsellingForm
                                            onSubmit={handleSubmit}
                                            semLabel={semesters[activeTab] ?? semesters[0]}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </section>
                    </TabsContent>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}
