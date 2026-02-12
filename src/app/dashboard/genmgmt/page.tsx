"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Settings } from "lucide-react";

import { AppSidebar } from "@/components/AppSidebar";
import {
  SidebarProvider,
} from "@/components/ui/sidebar";

import { managementCard, managementTabs, moduleManagementCard } from "@/config/app.config";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { TabsContent } from "@/components/ui/tabs";
import { DashboardCard } from "@/components/cards/DashboardCard";
import CourseSelectModal from "@/components/modals/CourseSelectModal";
import { Input } from "@/components/ui/input";

export default function GeneralManagementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [adminSearch, setAdminSearch] = useState("");
  const [moduleSearch, setModuleSearch] = useState("");
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const offeringsParam = searchParams.get("offerings");
  const tabValues = managementTabs.map((tab) => tab.value);
  const tabParam = searchParams.get("tab");
  const activeTab = tabParam && tabValues.includes(tabParam) ? tabParam : "Gen Mgmt";
  const activeTabLabel =
    managementTabs.find((tab) => tab.value === activeTab)?.title ?? "Admin Management";

  const updateTab = (value: string) => {
    if (value === activeTab) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const withTab = (href: string, tab: string) => {
    const [path, query = ""] = href.split("?");
    const params = new URLSearchParams(query);
    params.set("tab", tab);
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const handleLogout = () => {
    console.log("Logout clicked");
  };

  const filterCards = <T extends { title?: string; description?: string }>(
    cards: T[],
    query: string
  ) => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((card) => {
      const title = (card.title ?? "").toLowerCase();
      const description = (card.description ?? "").toLowerCase();
      return title.includes(q) || description.includes(q);
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

  useEffect(() => {
    if (offeringsParam) {
      setCourseModalOpen(true);
    }
  }, [offeringsParam]);

  return (
    <SidebarProvider>
      <main className="min-h-screen flex w-full bg-background">
        <aside><AppSidebar /></aside>

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <PageHeader
            title="General Management"
            description="Manage user access and roles in MCEME"
          />

          {/* Main Content */}
          <section className="flex-1 p-6">
            {/* Breadcrumb */}
            <nav>
              <BreadcrumbNav
                paths={[
                  { label: "Dashboard", href: "/dashboard" },
                  { label: activeTabLabel },
                ]}
              />
            </nav>
            {/* Welcome section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Admin Management
              </h2>
              <p className="text-muted-foreground">
                Centralize and oversee administrative processes, ensuring smooth coordination of all training and institutional activities.
              </p>
            </div>

            {/* Tabs Section */}
            <GlobalTabs
              defaultValue="Gen Mgmt"
              value={activeTab}
              onValueChange={updateTab}
              tabs={managementTabs}
            >
              {/* General Management Tab */}
              <TabsContent value="Gen Mgmt" className="space-y-6">
                <div className="flex items-center justify-end">
                  <Input
                    placeholder="Search modules..."
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    className="w-64"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-11 gap-y-6 mx-auto">
                  {filteredAdminCards.map((card, index) => {
                    const IconComponent = card.icon;
                    const { title = "", description = "", to = "", color = "" } = card;
                    const isOfferings = title === "Offerings Management";
                    const tabbedTo = to ? withTab(to, activeTab) : to;

                    return (
                      <DashboardCard
                        key={index}
                        title={title}
                        description={description}
                        to={isOfferings ? undefined : tabbedTo}
                        icon={IconComponent}
                        color={color}
                        onClick={isOfferings ? () => setCourseModalOpen(true) : undefined}
                      />
                    );
                  })}
                </div>
                {filteredAdminCards.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">No modules found.</p>
                )}
              </TabsContent>
              {/* Module Management Tab */}
              <TabsContent value="module-mgmt" className="space-y-6">
                <div className="flex items-center justify-end">
                  <Input
                    placeholder="Search modules..."
                    value={moduleSearch}
                    onChange={(e) => setModuleSearch(e.target.value)}
                    className="w-64"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-11 gap-y-6 mx-auto">
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
                        color={card.color}
                      />
                    );
                  })}
                </div>
                {filteredModuleCards.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">No modules found.</p>
                )}
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <div className="text-center py-12">
                  <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Coming Soon
                  </h3>
                  <p className="text-muted-foreground">
                    Settings module is under development and will be available soon.
                  </p>
                </div>
              </TabsContent>
            </GlobalTabs>
          </section>
        </div>
      </main>

      {/* Course Select Modal */}
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
