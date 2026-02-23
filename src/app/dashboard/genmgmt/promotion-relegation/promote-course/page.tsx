"use client";

import { AppSidebar } from "@/components/AppSidebar";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import PromoteCourseCard from "@/components/genmgmt/promotion-relegation/PromoteCourseCard";
import { usePromotionRelegationCourses } from "@/hooks/usePromotionRelegationMgmt";

export default function PromoteCoursePage() {
  const { courses } = usePromotionRelegationCourses();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col">
          <PageHeader
            title="Promote Course"
            description="Promote entire course with per-OC relegation exceptions"
          />

          <main className="flex-1 p-6">
            <BreadcrumbNav
              paths={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Promotion / Relegation Management", href: "/dashboard/genmgmt/promotion-relegation" },
                { label: "Promote Course" },
              ]}
            />

            <div className="mt-6">
              <PromoteCourseCard courses={courses} />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
