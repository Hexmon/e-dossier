"use client";

import React, { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useParams } from "next/navigation";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { resolveToneClasses } from "@/lib/theme-color";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Shield } from "lucide-react";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";

import CampContent from "@/components/camps/CampContent";
import { useOcDetails } from "@/hooks/useOcDetails";
import { useMe } from "@/hooks/useMe";
import { canBypassDossierSemesterLock } from "@/lib/dossier-semester-access";
import { useDossierSemesterRouting } from "@/hooks/useDossierSemesterRouting";
import SemesterLockNotice from "@/components/dossier/SemesterLockNotice";

interface FormValues {
  campsByName: {
    [campName: string]: {
      trainingCampId: string;
      year: number;
      reviews?: Array<{
        role: string;
        sectionTitle: string;
        reviewText: string;
      }>;
      activities?: Array<{
        trainingCampActivityId: string;
        name: string;
        marksScored: number | null;
        defaultMaxMarks: number;
        remark?: string | null;
      }>;
    };
  };
}



export default function OcCampsPage() {
  // ---------------------------
  // DYNAMIC ROUTE ID
  // ---------------------------
  const params = useParams();
  const paramId = params?.ocId || params?.id;
  const ocId = Array.isArray(paramId) ? paramId[0] : paramId ?? "";

  const { cadet, loading: loadingCadet } = useOcDetails(ocId);
  const { data: meData } = useMe();
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

  // ---------------------------
  // FORM SETUP
  // ---------------------------
  const methods = useForm<FormValues>({
    defaultValues: {
      campsByName: {},
    },
  });

  // ---------------------------
  // RENDER
  // ---------------------------
  return (
    <FormProvider {...methods}>
      <form>
        <DashboardLayout
          title="Camp Records"
          description="Manage OC Camp performance and reviews"
        >
          <main className="p-6">
            <BreadcrumbNav
              paths={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` },
                { label: "Camp Records" },
              ]}
            />

            {/* CADET TABLE */}
            {cadet && (
              <SelectedCadetTable
                selectedCadet={{
                  name: cadet.name,
                  courseName: cadet.courseName,
                  ocNumber: cadet.ocNumber,
                  ocId: cadet.ocId,
                  course: cadet.course,
                }}
              />
            )}

            <DossierTab
              ocId={ocId}
              tabs={dossierTabs}
              defaultValue="camps"
              extraTabs={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <TabsTrigger
                      value="miltrg"
                      className="flex items-center gap-2"
                    >
                      <Shield className="h-4 w-4" />
                      Mil-Trg
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </TabsTrigger>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {militaryTrainingCards.map((card) => {
                      const link = card.to(ocId);
                      if (!link) return null;

                      return (
                        <DropdownMenuItem key={card.title} asChild>
                          <a href={link} className="flex items-center gap-2">
                            <card.icon className={`h-4 w-4 ${resolveToneClasses(card.color, "text")}`} />
                            {card.title}
                          </a>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            >
              <TabsContent value="camps">
                <SemesterLockNotice
                    activeSemester={activeSemester}
                    currentSemester={currentSemester}
                    supportedSemesters={supportedSemesters}
                                    canOverrideLockedSemester={canEditLockedSemesters}
                  />
                <CampContent
                  ocId={ocId}
                  activeSemester={activeSemester}
                  onSemesterChange={setActiveSemester}
                  readOnly={isActiveSemesterLocked}
                />
              </TabsContent>
            </DossierTab>
          </main>
        </DashboardLayout>
      </form>
    </FormProvider>
  );
}
