"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import { DashboardCard } from "@/components/cards/DashboardCard";
import CourseSelectModal from "@/components/modals/CourseSelectModal";
import { academicManagementCards } from "@/config/app.config";

export default function AcademicsManagementPage() {
  const router = useRouter();
  const [courseModalOpen, setCourseModalOpen] = useState(false);

  return (
    <SidebarProvider>
      <main className="min-h-screen flex w-full bg-background">
        <aside><AppSidebar /></aside>

        <div className="flex-1 flex flex-col">
          <PageHeader
            title="Academics Management"
            description="Manage courses, offerings, and subjects"
          />

          <section className="flex-1 p-6">
            <nav>
              <BreadcrumbNav
                paths={[
                  { label: "Dashboard", href: "/dashboard" },
                  { label: "Module Management", href: "/dashboard/genmgmt?tab=module-mgmt" },
                  { label: "Academics Management" },
                ]}
              />
            </nav>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-11 gap-y-6 mx-auto">
              {academicManagementCards.map((card, index) => {
                const isOfferings = card.title === "Offerings Management";
                return (
                  <DashboardCard
                    key={`${card.title}-${index}`}
                    title={card.title}
                    description={card.description}
                    to={isOfferings ? undefined : card.to}
                    icon={card.icon}
                    color={card.color}
                    onClick={isOfferings ? () => setCourseModalOpen(true) : undefined}
                  />
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <CourseSelectModal
        open={courseModalOpen}
        onOpenChange={setCourseModalOpen}
        onSelect={(course) =>
          router.push(`/dashboard/genmgmt/coursemgmt/${course.id}/offerings`)
        }
      />
    </SidebarProvider>
  );
}
