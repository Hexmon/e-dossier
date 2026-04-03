"use client";

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import AcademicsTabs from "@/components/academics/AcademicsTabs";
import { useParams } from "next/navigation";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { useOcDetails } from "@/hooks/useOcDetails";
import { useMe } from "@/hooks/useMe";
import { canEditAcademics } from "@/lib/academics-access";
import DossierTab from "@/components/Tabs/DossierTab";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { ChevronDown, Shield } from "lucide-react";
import SemesterLockNotice from "@/components/dossier/SemesterLockNotice";
import { useDossierSemesterRouting } from "@/hooks/useDossierSemesterRouting";
import { canBypassDossierSemesterLock } from "@/lib/dossier-semester-access";

export default function AcademicsPage() {
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id || "";

    const { cadet } = useOcDetails(ocId);
    const { data: meData } = useMe();

    const {
        name = "",
        courseName = "",
        ocNumber = "",
        ocId: cadetOcId = ocId,
        course = "",
        currentSemester = 1,
    } = cadet || {};

    const selectedCadet = { name, courseName, ocNumber, ocId: cadetOcId, course, currentSemester };
    const canEditAcademicsForUser = canEditAcademics({
        roles: meData?.roles,
        position: meData?.apt?.position ?? null,
    });
    const academicsWorkflowActive = Boolean(meData?.workflowModules?.ACADEMICS_BULK?.isActive);
    const canEditLockedSemesters = canBypassDossierSemesterLock({
        roles: meData?.roles,
        position: meData?.apt?.position ?? null,
    });
    const { activeSemester, isActiveSemesterLocked, supportedSemesters } = useDossierSemesterRouting({
        currentSemester,
        supportedSemesters: [1, 2, 3, 4, 5, 6],
        canEditLockedSemesters,
    });

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
                        {academicsWorkflowActive ? (
                            <div className="mb-4 rounded-md border border-amber-400/40 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                Academics editing is read-only here while the review workflow is active. Use{" "}
                                <Link href={`/dashboard/manage-marks?courseId=${course}`}>Manage Marks</Link> to draft, submit, and verify updates.
                            </div>
                        ) : null}
                        {!academicsWorkflowActive && isActiveSemesterLocked ? (
                            <SemesterLockNotice
                                activeSemester={activeSemester}
                                currentSemester={currentSemester ?? 1}
                                supportedSemesters={supportedSemesters}
                            />
                        ) : null}
                        <AcademicsTabs
                            ocId={ocId}
                            courseId={course}
                            canEdit={canEditAcademicsForUser && !academicsWorkflowActive}
                            currentSemester={currentSemester ?? 1}
                            canEditLockedSemesters={canEditLockedSemesters}
                        />
                    </div>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}
