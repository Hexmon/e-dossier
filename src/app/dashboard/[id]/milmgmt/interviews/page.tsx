"use client";

import React from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import InterviewTabs from "@/components/interview/InterviewTabs";
import InterviewTermTabs from "@/components/interview-term/InterviewTermTabs";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { useOcDetails } from "@/hooks/useOcDetails";
import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Shield } from "lucide-react";
import { useMe } from "@/hooks/useMe";
import { canBypassDossierSemesterLock } from "@/lib/dossier-semester-access";
import { useDossierSemesterRouting } from "@/hooks/useDossierSemesterRouting";
import SemesterLockNotice from "@/components/dossier/SemesterLockNotice";

type InterviewModule = "initial" | "terms";

export default function InterviewsPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ocId = Array.isArray(params.id) ? params.id[0] : params.id ?? "";

  const { cadet } = useOcDetails(ocId);
  const { data: meData } = useMe();
  const {
    name = "",
    courseName = "",
    ocNumber = "",
    ocId: cadetOcId = ocId,
    course = "",
  } = cadet ?? {};
  const currentSemester = cadet?.currentSemester ?? 1;

  const selectedTab = searchParams.get("interview");
  const activeModule: InterviewModule = selectedTab === "terms" ? "terms" : "initial";

  const selectedCadet = {
    name,
    courseName,
    ocNumber,
    ocId: cadetOcId,
    course,
    currentSemester,
  };
  const canEditLockedSemesters = canBypassDossierSemesterLock({
    roles: meData?.roles,
    position: meData?.apt?.position ?? null,
  });
  const { activeSemester, isActiveSemesterLocked, supportedSemesters } = useDossierSemesterRouting({
    currentSemester,
    supportedSemesters: [1, 2, 3, 4, 5, 6],
    canEditLockedSemesters,
    legacyQueryKeys: ["sem", "semister"],
  });

  const buildInterviewPath = (module: InterviewModule) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("interview", module);
    return `${pathname}?${nextParams.toString()}`;
  };

  const switchModule = (module: InterviewModule) => {
    router.replace(buildInterviewPath(module), { scroll: false });
  };

  return (
    <DashboardLayout title="Interviews" description="Record and manage interview notes">
      <main className="p-6">
        <BreadcrumbNav
          paths={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` },
            { label: "Interviews" },
          ]}
        />

        {selectedCadet && (
          <div className="hidden md:flex sticky top-16 z-40 mb-6">
            <SelectedCadetTable selectedCadet={selectedCadet} />
          </div>
        )}

        <DossierTab
          tabs={dossierTabs}
          defaultValue="interviews"
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
          <div className="flex justify-center gap-2 mb-4">
            <button
              type="button"
              className={`px-4 py-2 rounded-md ${
                activeModule === "initial"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
              onClick={() => switchModule("initial")}
            >
              Initial Interview
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-md ${
                activeModule === "terms"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
              onClick={() => switchModule("terms")}
            >
              Terms Interview
            </button>
          </div>

          {isActiveSemesterLocked ? (
            <SemesterLockNotice
              activeSemester={activeSemester}
              currentSemester={currentSemester}
              supportedSemesters={supportedSemesters}
            />
          ) : null}

          {activeModule === "terms" ? (
            <InterviewTermTabs readOnly={isActiveSemesterLocked} currentSemester={currentSemester} canEditLockedSemesters={canEditLockedSemesters} />
          ) : (
            <InterviewTabs readOnly={isActiveSemesterLocked} currentSemester={currentSemester} canEditLockedSemesters={canEditLockedSemesters} />
          )}
        </DossierTab>
      </main>
    </DashboardLayout>
  );
}
