//DisciplineRecordsPage
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

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

import { semesters as SEMESTERS_CONST } from "@/constants/app.constants";

import type { DisciplineForm as DisciplineFormType, DisciplineRow } from "@/types/dicp-records";
import { useDisciplineRecords } from "@/hooks/useDisciplineRecords";
import DisciplineTable from "@/components/discipline/DisciplineTable";
import DisciplineForm from "@/components/discipline/DisciplineForm";
import { useOcDetails } from "@/hooks/useOcDetails";
import { getAppointments } from "@/app/lib/api/appointmentApi";

import type { RootState } from "@/store";
import { clearDisciplineForm } from "@/store/slices/disciplineRecordsSlice";

export default function DisciplineRecordsPage() {
    // dynamic route param
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";

    // Redux
    const dispatch = useDispatch();
    const savedFormData = useSelector((state: RootState) =>
        state.disciplineRecords.forms[ocId]
    );

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
        saveRecords,
        updateRecord,
        deleteRecord,
    } = useDisciplineRecords(ocId, semesters.length);

    const [activeTab, setActiveTab] = useState<number>(0);

    const { data: appointmentOptions = [], isLoading: appointmentsLoading } = useQuery({
        queryKey: ["discipline-awarded-by-options"],
        queryFn: async () => {
            try {
                const appointments = await getAppointments();
                const uniqueByUser = new Map<string, string>();

                for (const appt of appointments) {
                    const username = (appt.username || "").trim();
                    if (!username) continue;

                    if (!uniqueByUser.has(username)) {
                        const position = (appt.positionName || "").trim();
                        const platoon = (appt.platoonName || "").trim();
                        const label = [username, position ? `- ${position}` : "", platoon ? `(${platoon})` : ""]
                            .filter(Boolean)
                            .join(" ")
                            .trim();
                        uniqueByUser.set(username, label || username);
                    }
                }

                return Array.from(uniqueByUser.entries())
                    .map(([value, label]) => ({ value, label }))
                    .sort((a, b) => a.label.localeCompare(b.label));
            } catch {
                toast.error("Failed to load appointments for awarder dropdown");
                return [];
            }
        },
        staleTime: 5 * 60 * 1000,
    });

    // React Query handles fetching automatically, no need for manual fetchAll
    // The query will run when ocId changes due to the enabled flag in the hook

    // Handlers to pass to children
    const handleSubmit = async (data: DisciplineFormType) => {
        // Filter out empty rows
        const filledRows = data.records.filter(row => {
            const hasData =
                (row.dateOfOffence && row.dateOfOffence.trim() !== "") ||
                (row.offence && row.offence.trim() !== "") ||
                (row.punishmentAwarded && row.punishmentAwarded.trim() !== "") ||
                (row.dateOfAward && row.dateOfAward.trim() !== "") ||
                (row.byWhomAwarded && row.byWhomAwarded.trim() !== "") ||
                (row.negativePts && row.negativePts.trim() !== "");
            return hasData;
        });

        if (filledRows.length === 0) {
            toast.error("Please fill in at least one discipline record with data");
            return;
        }

        // Validate that filled rows have required fields
        const invalidRows = filledRows.filter(row =>
            !row.dateOfOffence || row.dateOfOffence.trim() === "" ||
            !row.offence || row.offence.trim() === ""
        );

        if (invalidRows.length > 0) {
            toast.error("Date of Offence and Offence are required for all records");
            return;
        }

        await saveRecords(activeTab + 1, filledRows);

        // Clear Redux cache after successful save
        dispatch(clearDisciplineForm(ocId));

        toast.success("Discipline records saved successfully!");
    };

    const handleClearForm = () => {
        if (confirm("Are you sure you want to clear all unsaved changes?")) {
            dispatch(clearDisciplineForm(ocId));
            toast.info("Form cleared");
        }
    };

    const handleUpdate = async (idToUpdate: string, payload: Partial<DisciplineRow>) => {
        await updateRecord(idToUpdate, {
            dateOfOffence: payload.dateOfOffence,
            offence: payload.offence,
            punishmentAwarded: payload.punishmentAwarded,
            punishmentId: payload.punishmentId,
            numberOfPunishments: payload.numberOfPunishments !== undefined
                ? Number(payload.numberOfPunishments)
                : undefined,
            awardedOn: payload.dateOfAward,
            awardedBy: payload.byWhomAwarded,
            pointsDelta:
                payload.negativePts !== undefined
                    ? Number(payload.negativePts)
                    : undefined,
        });
    };

    const handleDelete = async (row: DisciplineRow) => {
        if (!row.id) return;
        await deleteRecord(row.id);
    };

    // Get default values - prioritize Redux over empty form
    const getDefaultValues = (): DisciplineFormType => {
        if (savedFormData && savedFormData.length > 0) {
            return {
                records: savedFormData,
            };
        }

        return {
            records: [
                {
                    serialNo: "",
                    dateOfOffence: "",
                    offence: "",
                    punishmentAwarded: "",
                    punishmentId: "",
                    numberOfPunishments: "1",
                    dateOfAward: "",
                    byWhomAwarded: "",
                    negativePts: "",
                    cumulative: "",
                },
            ],
        };
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
                                    appointmentOptions={appointmentOptions}
                                    appointmentsLoading={appointmentsLoading}
                                    onEditSave={handleUpdate}
                                    onDelete={handleDelete}
                                />

                                <div className="mt-6">
                                    <DisciplineForm
                                        key={`${ocId}-${savedFormData ? 'redux' : 'default'}`}
                                        onSubmit={handleSubmit}
                                        defaultValues={getDefaultValues()}
                                        ocId={ocId}
                                        appointmentOptions={appointmentOptions}
                                        appointmentsLoading={appointmentsLoading}
                                        onClear={handleClearForm}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}
