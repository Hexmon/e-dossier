"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";

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
import Link from "next/link";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

import { useOcDetails } from "@/hooks/useOcDetails";
import { semestersCounselling } from "@/constants/app.constants";
import { useCounsellingRecords } from "@/hooks/useCounsellingRecords";
import CounsellingTable from "@/components/counselling/CounsellingTable";
import CounsellingForm from "@/components/counselling/CounsellingForm";
import { CounsellingFormData } from "@/types/counselling";
import { saveCounsellingForm, clearCounsellingForm } from "@/store/slices/counsellingRecordsSlice";

export default function CounsellingWarningPage() {
    // route param
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const dispatch = useDispatch();

    // Get saved form data from Redux
    const savedFormData = useSelector((state: RootState) =>
        state.counsellingRecords.forms[ocId]
    );

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

    const semParam = searchParams.get("semester");
    const resolvedTab = useMemo(() => {
        const parsed = Number(semParam);
        if (!Number.isFinite(parsed)) return 0;
        const idx = parsed - 1;
        if (idx < 0 || idx >= semesters.length) return 0;
        return idx;
    }, [semParam, semesters.length]);
    const [activeTab, setActiveTab] = useState<number>(resolvedTab);

    useEffect(() => {
        setActiveTab(resolvedTab);
    }, [resolvedTab]);

    const updateSemesterParam = (index: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("semester", String(index + 1));
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const handleSemesterChange = (index: number) => {
        setActiveTab(index);
        updateSemesterParam(index);
    };

    useEffect(() => {
        if (!ocId) return;
        fetchAll();
    }, [ocId, fetchAll]);

    const handleSubmit = async (data: CounsellingFormData) => {
        const termLabel = semesters[activeTab] ?? semesters[0];
        await saveRecords(termLabel, data.records);

        // Clear Redux cache after successful save
        dispatch(clearCounsellingForm(ocId));

        toast.success("Counselling records saved successfully");
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

    const handleClearForm = () => {
        if (confirm("Are you sure you want to clear all unsaved changes?")) {
            dispatch(clearCounsellingForm(ocId));
            toast.info("Form cleared");
        }
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
                                                    onClick={() => handleSemesterChange(idx)}
                                                    className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === idx
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-muted text-foreground"
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
                                            ocId={ocId}
                                            savedFormData={savedFormData}
                                            onClearForm={handleClearForm}
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
