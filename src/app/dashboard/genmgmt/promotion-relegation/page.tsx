"use client";

import { AppSidebar } from "@/components/AppSidebar";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import PromotionRelegationCards from "@/components/genmgmt/promotion-relegation/PromotionRelegationCards";

export default function PromotionRelegationPage() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col">
          <PageHeader
            title="Promotion / Relegation Management"
            description="Manage OC relegations, exceptions, and batch promotions"
          />

          <main className="flex-1 p-6">
            <BreadcrumbNav
              paths={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Promotion / Relegation Management" },
              ]}
            />

            <div className="mt-6">
              <PromotionRelegationCards />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
