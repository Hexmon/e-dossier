"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Monitor, Search, Settings } from "lucide-react";

import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { managementCard, managementTabs, moduleManagementCard } from "@/config/app.config";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { TabsContent } from "@/components/ui/tabs";
import { DashboardCard } from "@/components/cards/DashboardCard";
import CourseSelectModal from "@/components/modals/CourseSelectModal";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { resolveToneClasses, type ColorTone } from "@/lib/theme-color";
import { SetupResumeBanner } from "@/components/setup/SetupResumeBanner";
import type { SetupStepKey } from "@/app/lib/setup-status";

type GeneralManagementPageClientProps = {
  isSuperAdmin: boolean;
  showSetupResumeBanner: boolean;
  setupComplete: boolean;
  nextSetupStep: SetupStepKey | null;
};

export default function GeneralManagementPageClient({
  isSuperAdmin,
  showSetupResumeBanner,
  setupComplete,
  nextSetupStep,
}: GeneralManagementPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [adminSearch, setAdminSearch] = useState("");
  const [moduleSearch, setModuleSearch] = useState("");
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const tabParam = searchParams.get("tab");
  const validTabs = managementTabs.map((tab) => tab.value);
  const activeTab = tabParam && validTabs.includes(tabParam) ? tabParam : "Gen Mgmt";
  const activeTabLabel =
    managementTabs.find((tab) => tab.value === activeTab)?.title ?? "Admin Management";

  const updateTab = (value: string) => {
    if (value === activeTab) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", value);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  const withTab = (href: string, tab: string) => {
    const [path, query = ""] = href.split("?");
    const params = new URLSearchParams(query);
    params.set("tab", tab);
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const filterCards = <T extends { title?: string; description?: string }>(
    cards: T[],
    query: string
  ) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return cards;
    return cards.filter((card) => {
      const title = (card.title ?? "").toLowerCase();
      const description = (card.description ?? "").toLowerCase();
      return title.includes(normalizedQuery) || description.includes(normalizedQuery);
    });
  };

  const filteredAdminCards = useMemo(
    () => filterCards(managementCard, adminSearch),
    [adminSearch]
  );

  const filteredModuleCards = useMemo(
    () => filterCards(moduleManagementCard, moduleSearch),
    [moduleSearch]
  );

  return (
    <SidebarProvider>
      <main className="flex min-h-screen w-full bg-background">
        <aside>
          <AppSidebar />
        </aside>

        <div className="flex flex-1 flex-col">
          <PageHeader
            title="General Management"
            description="Manage user access and roles in MCEME"
          />

          <section className="flex-1 p-6">
            <nav>
              <BreadcrumbNav
                paths={[
                  { label: "Dashboard", href: "/dashboard" },
                  { label: activeTabLabel },
                ]}
              />
            </nav>

            <div className="mb-8">
              <h2 className="mb-2 text-2xl font-bold text-primary">
                Admin Management
              </h2>
              <p className="text-muted-foreground">
                Centralize and oversee administrative processes, ensuring smooth coordination of all training and institutional activities.
              </p>
            </div>

            <SetupResumeBanner
              visible={showSetupResumeBanner}
              setupComplete={setupComplete}
              nextStep={nextSetupStep}
            />

            <GlobalTabs
              defaultValue="Gen Mgmt"
              value={activeTab}
              onValueChange={updateTab}
              tabs={managementTabs}
            >
              <TabsContent value="Gen Mgmt" className="space-y-6">
                <div className="flex items-center justify-end">
                  <div className="relative w-64">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md bg-primary/10 p-1">
                      <Search className="h-4 w-4 text-primary" />
                    </span>
                    <Input
                      placeholder="Search modules..."
                      value={adminSearch}
                      onChange={(event) => setAdminSearch(event.target.value)}
                      className="w-full pl-10"
                    />
                  </div>
                </div>
                <div className="mx-auto grid grid-cols-1 gap-x-11 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredAdminCards.map((card, index) => {
                    const IconComponent = card.icon;
                    const title = card.title ?? "";
                    const description = card.description ?? "";
                    const to = card.to ?? "";
                    const color = card.color as ColorTone;
                    const iconTone = resolveToneClasses(color, "icon");
                    const isOfferings = title === "Offerings Management";
                    const tabbedTo = to ? withTab(to, activeTab) : to;

                    if (isOfferings) {
                      return (
                        <Card
                          key={index}
                          className="cursor-pointer border-l-4 border-l-primary transition-shadow duration-200 hover:shadow-lg"
                          onClick={() => setCourseModalOpen(true)}
                        >
                          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                            <div className={`${iconTone} rounded-lg p-2`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">{description}</p>
                          </CardContent>
                          <CardFooter>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full cursor-pointer border-border"
                            >
                              Access Module {"->"}
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    }

                    return (
                      <DashboardCard
                        key={index}
                        title={title}
                        description={description}
                        to={tabbedTo}
                        icon={IconComponent}
                        color={color}
                        onClick={isOfferings ? () => setCourseModalOpen(true) : undefined}
                      />
                    );
                  })}
                </div>
                {filteredAdminCards.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground">No modules found.</p>
                ) : null}
              </TabsContent>

              <TabsContent value="module-mgmt" className="space-y-6">
                <div className="flex items-center justify-end">
                  <div className="relative w-64">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md bg-primary/10 p-1">
                      <Search className="h-4 w-4 text-primary" />
                    </span>
                    <Input
                      placeholder="Search modules..."
                      value={moduleSearch}
                      onChange={(event) => setModuleSearch(event.target.value)}
                      className="w-full pl-10"
                    />
                  </div>
                </div>
                <div className="mx-auto grid grid-cols-1 gap-x-11 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredModuleCards.map((card, index) => {
                    const IconComponent = card.icon;
                    const tabbedTo = card.to ? withTab(card.to, activeTab) : card.to;
                    return (
                      <DashboardCard
                        key={index}
                        title={card.title}
                        description={card.description}
                        to={tabbedTo}
                        icon={IconComponent}
                        color={card.color as ColorTone}
                      />
                    );
                  })}
                </div>
                {filteredModuleCards.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground">No modules found.</p>
                ) : null}
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <div className="mx-auto grid grid-cols-1 gap-x-11 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                  <DashboardCard
                    title="Admin Site Settings"
                    description="Manage landing page content including logo, hero text, commanders, awards, and history."
                    to="/dashboard/genmgmt/settings/site"
                    icon={Settings}
                    color="info"
                  />
                  <DashboardCard
                    title="Device Site Settings"
                    description="Configure theme, language, timezone, refresh interval, and layout density per device."
                    to="/dashboard/settings/device"
                    icon={Monitor}
                    color="muted"
                  />
                  <DashboardCard
                    title="Marks Review Workflow"
                    description="Configure data entry, verification, and override users for bulk Academics and PT workflows."
                    to="/dashboard/genmgmt/settings/marks-review-workflow"
                    icon={Settings}
                    color="warning"
                  />
                  {isSuperAdmin ? (
                    <DashboardCard
                      title="Module Access Settings"
                      description="Configure whether ADMIN can access Dossier Management, Bulk Upload, and Reports."
                      to="/dashboard/genmgmt/settings/module-access"
                      icon={Settings}
                      color="info"
                    />
                  ) : null}
                </div>
              </TabsContent>
            </GlobalTabs>
          </section>
        </div>
      </main>

      <CourseSelectModal
        open={courseModalOpen}
        onOpenChange={setCourseModalOpen}
        onSelect={(course) =>
          router.push(withTab(`/dashboard/genmgmt/coursemgmt/${course.id}/offerings`, activeTab))
        }
      />
    </SidebarProvider>
  );
}
