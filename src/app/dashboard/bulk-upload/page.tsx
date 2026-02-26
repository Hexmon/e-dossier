"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Dumbbell } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { DashboardCard } from "@/components/cards/DashboardCard";
import { useMe } from "@/hooks/useMe";
import { resolvePageAction } from "@/app/lib/acx/action-map";
import { isAuthzV2Enabled } from "@/app/lib/acx/feature-flag";

export default function BulkUploadPage() {
  const router = useRouter();
  const { data: meData, isLoading: meLoading } = useMe();
  const authzV2Enabled = isAuthzV2Enabled();

  const canAccessRoute = useMemo(() => {
    return (route: string) => {
      if (!authzV2Enabled) return true;
      if (meLoading) return true;

      const page = resolvePageAction(route);
      if (!page) return true;

      const roles = (meData?.roles ?? []).map((role) => String(role).toUpperCase());
      const permissions = new Set<string>((meData?.permissions ?? []) as string[]);

      if (roles.includes("SUPER_ADMIN")) return true;
      if (roles.includes("ADMIN") && page.adminBaseline) return true;
      if (permissions.has("*")) return true;
      return permissions.has(page.action);
    };
  }, [authzV2Enabled, meData?.permissions, meData?.roles, meLoading]);

  const canViewAcademics = canAccessRoute("/dashboard/manage-marks");
  const canViewPt = canAccessRoute("/dashboard/manage-pt-marks");
  const canViewHub = canAccessRoute("/dashboard/bulk-upload") || canViewAcademics || canViewPt;
  const hasAnyCard = canViewAcademics || canViewPt;

  useEffect(() => {
    if (!authzV2Enabled || meLoading) return;
    if (!canViewHub || !hasAnyCard) {
      router.replace("/dashboard");
    }
  }, [authzV2Enabled, canViewHub, hasAnyCard, meLoading, router]);

  if (authzV2Enabled && !meLoading && (!canViewHub || !hasAnyCard)) {
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
