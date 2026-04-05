"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
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
import { useMe } from "@/hooks/useMe";
import { canBypassDossierSemesterLock } from "@/lib/dossier-semester-access";
import { useDossierSemesterRouting } from "@/hooks/useDossierSemesterRouting";
import SemesterLockNotice from "@/components/dossier/SemesterLockNotice";

export default function CounsellingWarningPage() {
    // route param
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";
    const dispatch = useDispatch();

    // Get saved form data from Redux
    const savedFormData = useSelector((state: RootState) =>
        state.counsellingRecords.forms[ocId]
    );

    // cadet data via hook (no redux)
    const { cadet } = useOcDetails(ocId);
    const { data: meData } = useMe();

    const {
        name = "",
        courseName = "",
        ocNumber = "",
        ocId: cadetOcId = ocId,
        course = "",
        currentSemester = 1,
    } = cadet ?? {};

    const selectedCadet = { name, courseName, ocNumber, ocId: cadetOcId, course, currentSemester };
    const canEditLockedSemesters = canBypassDossierSemesterLock({
        roles: meData?.roles,
        position: meData?.apt?.position ?? null,
    });

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

    const { activeSemester, setActiveSemester, isActiveSemesterLocked, supportedSemesters } = useDossierSemesterRouting({
        currentSemester,
        supportedSemesters: [1, 2, 3, 4, 5, 6],
        canEditLockedSemesters,
    });
    const activeTab = activeSemester - 1;

    const handleSemesterChange = (index: number) => {
        setActiveSemester(index + 1);
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
                            <Card className="max-w-6xl mx-auto p-6 shadow bg-card">
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold text-center">
                                        COUNSELLING / WARNING RECORD : ALL TERMS
                                    </CardTitle>
                                </CardHeader>

                                <CardContent>
                                    <SemesterLockNotice
                                            activeSemester={activeSemester}
                                            currentSemester={currentSemester ?? 1}
                                            supportedSemesters={supportedSemesters}
                                    canOverrideLockedSemester={canEditLockedSemesters}
                                        />
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
                                        readOnly={isActiveSemesterLocked}
                                    />

                                    {!isActiveSemesterLocked ? (
                                        <div className="mt-6">
                                            <CounsellingForm
                                                onSubmit={handleSubmit}
                                                semLabel={semesters[activeTab] ?? semesters[0]}
                                                ocId={ocId}
                                                savedFormData={savedFormData}
                                                onClearForm={handleClearForm}
                                            />
                                        </div>
                                    ) : null}
                                </CardContent>
                            </Card>
                        </section>
                    </TabsContent>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}
