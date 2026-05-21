"use client";

import { AppSidebar } from "@/components/AppSidebar";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import RelegationManagementCard from "@/components/genmgmt/promotion-relegation/RelegationManagementCard";

export default function RelegationManagementPage() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col">
          <PageHeader
            title="Relegation Management"
            description="Transfer OCs and review relegation history"
          />

          <main className="flex-1 p-6">
            <BreadcrumbNav
              paths={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Admin Management", href: "/dashboard/genmgmt?tab=Gen%20Mgmt" },
                { label: "Promotion / Relegation Management", href: "/dashboard/genmgmt/promotion-relegation" },
                { label: "Relegation Management" },
              ]}
            />

            <div className="mt-6">
              <RelegationManagementCard />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
