"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Dumbbell } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { DashboardCard } from "@/components/cards/DashboardCard";
import { useMe } from "@/hooks/useMe";

export default function BulkUploadPage() {
  const router = useRouter();
  const { data: meData, isLoading: meLoading } = useMe();
  const moduleAccess = meData?.moduleAccess;
  const canViewAcademics = moduleAccess?.canAccessAcademicsBulk ?? true;
  const canViewPt = moduleAccess?.canAccessPtBulk ?? true;
  const canViewHub = moduleAccess?.canAccessBulkUpload ?? (canViewAcademics || canViewPt);
  const hasAnyCard = canViewAcademics || canViewPt;

  useEffect(() => {
    if (meLoading) return;
    if (!canViewHub || !hasAnyCard) {
      router.replace("/dashboard");
    }
  }, [canViewHub, hasAnyCard, meLoading, router]);

  if (!meLoading && (!canViewHub || !hasAnyCard)) {
    return null;
  }

  return (
    <DashboardLayout
      title="Bulk Upload"
      description="Choose module for course-level bulk entry"
    >
      <main className="p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {canViewAcademics ? (
            <DashboardCard
              title="Academics Bulk Upload"
              description="Open subject-wise bulk marks entry for a selected course and semester."
              to="/dashboard/manage-marks"
              icon={BookOpen}
              color="info"
            />
          ) : null}
          {canViewPt ? (
            <DashboardCard
              title="PT Bulk Upload"
              description="Open course-level bulk physical training score and motivation entry."
              to="/dashboard/manage-pt-marks"
              icon={Dumbbell}
              color="warning"
            />
          ) : null}
        </div>
      </main>
    </DashboardLayout>
  );
}
