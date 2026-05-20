"use client";

import { AppSidebar } from "@/components/AppSidebar";
import RelegationHistoryCard from "@/components/genmgmt/promotion-relegation/RelegationHistoryCard";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { usePromotionRelegationCourses } from "@/hooks/usePromotionRelegationMgmt";

export default function RelegationHistoryPage() {
  const { courses } = usePromotionRelegationCourses();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col">
          <PageHeader
            title="Relegation History"
            description="Search, filter, and audit OC promotion and relegation movements"
          />

          <main className="flex-1 p-6">
            <BreadcrumbNav
              paths={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Admin Management", href: "/dashboard/genmgmt?tab=Gen%20Mgmt" },
                { label: "Promotion / Relegation Management", href: "/dashboard/genmgmt/promotion-relegation" },
                { label: "Relegation History" },
              ]}
            />

            <div className="mt-6">
              <RelegationHistoryCard courses={courses} />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
