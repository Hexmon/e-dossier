"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { TabsContent } from "@/components/ui/tabs";
import { ocTabs } from "@/config/app.config";
import ReportVerificationPanel from "@/components/genmgmt/admin-mgmt/ReportVerificationPanel";

export default function ReportVerificationPage() {
  return (
    <SidebarProvider>
      <section className="flex min-h-screen w-full bg-background">
        <AppSidebar />

        <main className="flex-1 flex flex-col">
          <PageHeader
            title="Report Verification"
            description="Verify downloaded report PDFs using version code and checksum integrity."
          />

          <section className="p-6">
            <BreadcrumbNav
              paths={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Admin Mgmt", href: "/dashboard/genmgmt" },
                { label: "Report Verification" },
              ]}
            />

            <GlobalTabs tabs={ocTabs} defaultValue="report-verification">
              <TabsContent value="report-verification" className="space-y-6">
                <ReportVerificationPanel />
              </TabsContent>
            </GlobalTabs>
          </section>
        </main>
      </section>
    </SidebarProvider>
  );
}
