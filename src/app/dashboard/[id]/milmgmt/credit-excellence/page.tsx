// app/dashboard/[id]/cfe/page.tsx
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
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

import { useOcDetails } from "@/hooks/useOcDetails";
import { semestersCfe } from "@/constants/app.constants";

import { cfeFormData } from "@/types/cfe";
import { useCfeRecords } from "@/hooks/useCfeRecords";
import CfeTable from "@/components/cfe/CfeTable";
import CfeForm from "@/components/cfe/CfeForm";

export default function CFEFormPage() {
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

    const semesters =
        Array.isArray(semestersCfe) && semestersCfe.length > 0
            ? semestersCfe
            : ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];

    const {
        groups,
        loading,
        fetchAll,
        saveSemesterPayload,
        replaceSemesterPayload,
        deleteRecordById,
    } = useCfeRecords(ocId, semesters.length);

    const [activeTab, setActiveTab] = useState<number>(0);

    useEffect(() => {
        if (!ocId) {
            return;
        }
        fetchAll();
    }, [ocId, fetchAll]);

    // create payload by appending new records to existing group's items
    const handleSubmit = async (data: cfeFormData) => {
        const termIndex = activeTab;
        await saveSemesterPayload(termIndex, data.records);
    };

    // replace an entire semester payload (used by inline-edit save)
    const handleReplaceSemester = async (semesterIndex: number, items: { cat: string; marks: number; remarks?: string }[]) => {
        await replaceSemesterPayload(semesterIndex, items);
    };

    const handleDelete = async (recordId: string) => {
        await deleteRecordById(recordId);
    };

    return (
        <DashboardLayout
            title="Credit For Excellence (CFE)"
            description="Manage and record cadet’s CFE scores and evaluation details."
        >
            <main className="flex-1 p-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` },
                        { label: "Credit For Excellence" },
                    ]}
                />

                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="credit-excellence"
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
                    <TabsContent value="credit-excellence">
                        <Card className="max-w-6xl mx-auto p-6 rounded-2xl shadow bg-white">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-center">
                                    CREDIT FOR EXCELLENCE (CFE)
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                <div className="flex justify-center mb-6 space-x-2">
                                    {semesters.map((s, idx) => {
                                        return (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setActiveTab(idx)}
                                                className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === idx ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                                                    }`}
                                            >
                                                {s}
                                            </button>
                                        );
                                    })}
                                </div>

                                <CfeTable
                                    rows={groups[activeTab] ?? []}
                                    loading={loading}
                                    onStartEdit={async (index) => {
                                        /* table handles inline start */
                                        return;
                                    }}
                                    onReplaceSemester={handleReplaceSemester}
                                    onDelete={handleDelete}
                                />

                                <div className="mt-6">
                                    <CfeForm onSubmit={handleSubmit} semIndex={activeTab} existingRows={groups[activeTab] ?? []} />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}
