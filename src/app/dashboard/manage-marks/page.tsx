"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import ManageMarksPageContent from "@/components/academics/ManageMarksPageContent";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useMe } from "@/hooks/useMe";
import { resolvePageAction } from "@/app/lib/acx/action-map";
import { isAuthzV2Enabled } from "@/app/lib/acx/feature-flag";

export default function ManageMarksPage() {
    const router = useRouter();
    const { data: meData, isLoading: meLoading } = useMe();
    const authzV2Enabled = isAuthzV2Enabled();

    const hasPageAccess = useMemo(() => {
        if (!authzV2Enabled) return true;
        if (meLoading) return true;

        const page = resolvePageAction("/dashboard/manage-marks");
        if (!page) return true;

        const roles = (meData?.roles ?? []).map((role) => String(role).toUpperCase());
        const permissions = new Set<string>((meData?.permissions ?? []) as string[]);

        if (roles.includes("SUPER_ADMIN")) return true;
        if (roles.includes("ADMIN") && page.adminBaseline) return true;
        if (permissions.has("*")) return true;
        return permissions.has(page.action);
    }, [authzV2Enabled, meData?.permissions, meData?.roles, meLoading]);

    useEffect(() => {
        if (!authzV2Enabled || meLoading) return;
        if (!hasPageAccess) {
            router.replace("/dashboard");
        }
    }, [authzV2Enabled, hasPageAccess, meLoading, router]);

    if (authzV2Enabled && !meLoading && !hasPageAccess) {
        return null;
    }

    return (
        <DashboardLayout
            title="Academics Management"
            description="Subject-wise marks entry"
        >
            <main className="p-6">
                <ManageMarksPageContent />
            </main>
        </DashboardLayout>
    );
}
