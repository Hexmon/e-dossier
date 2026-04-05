"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useOcDetails } from "@/hooks/useOcDetails";
import DashboardLayout from "@/components/layout/DashboardLayout";

import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import { DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Shield, ChevronDown } from "lucide-react";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PhysicalForm from "@/components/physic-training/PhysicalForm";
import { useMe } from "@/hooks/useMe";
import Link from "next/link";
import { useDossierSemesterRouting } from "@/hooks/useDossierSemesterRouting";
import { canBypassDossierSemesterLock } from "@/lib/dossier-semester-access";
import SemesterLockNotice from "@/components/dossier/SemesterLockNotice";

export default function PhysicalTrainingPage() {
  const params = useParams();
  // Handle both 'id' and 'ocId' param names
  const paramId = params?.ocId || params?.id;
  const ocId = Array.isArray(paramId) ? paramId[0] : paramId ?? "";
  const { cadet } = useOcDetails(ocId);
  const { data: meData } = useMe();
  const ptWorkflowActive = Boolean(meData?.workflowModules?.PT_BULK?.isActive);
  const currentSemester = cadet?.currentSemester ?? 1;
  const canEditLockedSemesters = canBypassDossierSemesterLock({
    roles: meData?.roles,
    position: meData?.apt?.position ?? null,
  });
  const { activeSemester, setActiveSemester, isActiveSemesterLocked, supportedSemesters } = useDossierSemesterRouting({
    currentSemester,
    supportedSemesters: [1, 2, 3, 4, 5, 6],
    canEditLockedSemesters,
  });

  return (
    <DashboardLayout
      title="Physical Training"
      description="Record and manage cadet physical training details."
    >
      <main className="p-6">
        <BreadcrumbNav
          paths={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` },
            { label: "Physical Training" },
          ]}
        />

        {cadet ? (
          <SelectedCadetTable
            selectedCadet={{
              name: cadet.name ?? "",
              courseName: cadet.courseName ?? "",
              ocNumber: cadet.ocNumber ?? "",
              ocId: cadet.ocId ?? "",
              course: cadet.course ?? "",
            }}
          />
        ) : (
          <SelectedCadetTable
            selectedCadet={{
              name: "",
              courseName: "",
              ocNumber: "",
              ocId: ocId,
              course: "",
            }}
          />
        )}

        <DossierTab
          tabs={dossierTabs}
          defaultValue="physical-training"
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
          <TabsContent value="physical-training">
            <Card className="max-w-6xl mx-auto p-6 rounded-2xl shadow-xl bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-center text-primary">
                  Physical Training
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!ptWorkflowActive ? (
                  <SemesterLockNotice
                    activeSemester={activeSemester}
                    currentSemester={currentSemester}
                    supportedSemesters={supportedSemesters}
                    canOverrideLockedSemester={canEditLockedSemesters}
                  />
                ) : null}
                {ptWorkflowActive ? (
                  <div className="mb-4 rounded-md border border-warning/30 bg-warning/20 px-4 py-3 text-sm text-warning-foreground">
                    Physical training editing is read-only here while the review workflow is active. Use{" "}
                    <Link href={`/dashboard/manage-pt-marks?courseId=${cadet?.course ?? ""}`}>Manage PT Marks</Link> to draft, submit, and verify updates.
                  </div>
                ) : null}
                <PhysicalForm
                  ocId={ocId}
                  readOnly={ptWorkflowActive || isActiveSemesterLocked}
                  activeSemester={activeSemester}
                  onSemesterChange={setActiveSemester}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </DossierTab>
      </main>
    </DashboardLayout>
  );
}
