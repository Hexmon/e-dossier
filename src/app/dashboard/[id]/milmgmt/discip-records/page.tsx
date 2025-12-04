"use client";

import { useEffect, useState, useCallback } from "react";
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


import { useOcPersonal } from "@/hooks/useOcPersonal";
import { semesters as SEMESTERS_CONST } from "@/constants/app.constants";

import type { DisciplineForm as DisciplineFormType} from "@/types/dicp-records";
import { DisciplineRow } from "@/hooks/useDisciplineRecords";

import { useDisciplineRecords } from "@/hooks/useDisciplineRecords";
import DisciplineTable from "@/components/discipline/DisciplineTable";
import DisciplineForm from "@/components/discipline/DisciplineForm";
import { useOcDetails } from "@/hooks/useOcDetails";

export default function DisciplineRecordsPage() {
    // dynamic route param
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";

    // Load cadet data via hook (no redux)
    const { cadet } = useOcDetails(ocId);

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

    // semesters (fallback to 6 terms if constant missing)
    const semesters = Array.isArray(SEMESTERS_CONST) && SEMESTERS_CONST.length > 0
        ? SEMESTERS_CONST
        : ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];

    // Discipline hook
    const {
        groupedBySemester,
        loading,
        fetchAll,
        saveRecords,
        updateRecord,
        deleteRecord,
    } = useDisciplineRecords(ocId, semesters.length);

    const [activeTab, setActiveTab] = useState<number>(0);

    useEffect(() => {
        if (!ocId) return;
        fetchAll();
    }, [ocId, fetchAll]);

    // Handlers to pass to children
    const handleSubmit = async (data: DisciplineFormType) => {
        await saveRecords(activeTab + 1, data.records);
    };

    const handleUpdate = async (idToUpdate: string, payload: Partial<DisciplineRow>) => {
        await updateRecord(idToUpdate, {
        dateOfOffence: payload.dateOfOffence,
        offence: payload.offence,
        punishmentAwarded: payload.punishmentAwarded,
        awardedOn: payload.dateOfAward,
        awardedBy: payload.byWhomAwarded,
        pointsDelta:
            payload.negativePts !== undefined
                ? Number(payload.negativePts)
                : undefined,
    });
    };

    const handleDelete = async (row: DisciplineRow): Promise<void> => {
        if (!row.id) return;
        await deleteRecord(row.id);
    };

    return (
        <DashboardLayout
            title="Discipline Records"
            description="Log disciplinary actions and observations."
        >
            <main className="p-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` },
                        { label: "Discipline Records" },
                    ]}
                />

                {cadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="discip-records"
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
                    {/* Tab content */}
                    <div style={{ width: "100%" }}>
                        <div className="max-w-6xl mx-auto space-y-6">
                            <div className="p-6 rounded-2xl shadow-xl bg-white">
                                <div className="flex justify-center items-center mb-4">
                                    <h2 className="text-xl font-semibold text-primary">DISCIPLINE RECORDS</h2>
                                </div>

                                <div className="flex justify-center mb-6 space-x-2">
                                    {semesters.map((sem, index) => {
                                        return (
                                            <button
                                                key={sem}
                                                type="button"
                                                onClick={() => setActiveTab(index)}
                                                className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === index
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-gray-200 text-gray-700"
                                                    }`}
                                            >
                                                {sem}
                                            </button>
                                        );
                                    })}
                                </div>

                                <DisciplineTable
                                    rows={groupedBySemester[activeTab]}
                                    loading={loading}
                                    onEditSave={handleUpdate}
                                    onDelete={handleDelete}
                                />

                                <div className="mt-6">
                                    <DisciplineForm onSubmit={handleSubmit} />
                                </div>
                            </div>
                        </div>
                    </div>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}