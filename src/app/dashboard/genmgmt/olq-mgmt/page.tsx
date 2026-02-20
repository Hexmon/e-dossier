"use client";

import { AppSidebar } from "@/components/AppSidebar";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import { PageHeader } from "@/components/layout/PageHeader";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import ModuleMgmtOlqCard from "@/components/genmgmt/module-mgmt/ModuleMgmtOlqCard";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TabsContent } from "@/components/ui/tabs";
import { moduleManagementTabs } from "@/config/app.config";

export default function OlqManagementPage() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col">
          <PageHeader
            title="OLQ Management"
            description="Manage OLQ category/subtitle templates and copy between courses"
          />

          <main className="flex-1 p-6">
            <BreadcrumbNav
              paths={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Module Mgmt", href: "/dashboard/genmgmt?tab=module-mgmt" },
                { label: "OLQ Management" },
              ]}
            />

            <GlobalTabs tabs={moduleManagementTabs} defaultValue="olq-mgmt">
              <TabsContent value="olq-mgmt" className="space-y-6">
                <ModuleMgmtOlqCard />
              </TabsContent>
            </GlobalTabs>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
