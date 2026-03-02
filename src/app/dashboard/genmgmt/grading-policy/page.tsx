"use client";

import { AppSidebar } from "@/components/AppSidebar";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import { PageHeader } from "@/components/layout/PageHeader";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TabsContent } from "@/components/ui/tabs";
import { moduleManagementTabs } from "@/config/app.config";
import ModuleMgmtGradingPolicyCard from "@/components/genmgmt/module-mgmt/ModuleMgmtGradingPolicyCard";

export default function GradingPolicyPage() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col">
          <PageHeader
            title="Academic Grading Policy"
            description="Configure global grading bands and recalculate academic outcomes."
          />

          <main className="flex-1 p-6">
            <BreadcrumbNav
              paths={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Module Mgmt", href: "/dashboard/genmgmt?tab=module-mgmt" },
                { label: "Grading Policy" },
              ]}
            />

            <GlobalTabs tabs={moduleManagementTabs} defaultValue="grading-policy">
              <TabsContent value="grading-policy" className="space-y-6">
                <ModuleMgmtGradingPolicyCard />
              </TabsContent>
            </GlobalTabs>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
