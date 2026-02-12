"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { AppSidebar } from "@/components/AppSidebar";
import {
  SidebarProvider,
} from "@/components/ui/sidebar";

import { academicManagementCards, managementCard, managementTabs, moduleManagementCard } from "@/config/app.config";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { TabsContent } from "@/components/ui/tabs";
import { DashboardCard } from "@/components/cards/DashboardCard";
import CourseSelectModal from "@/components/modals/CourseSelectModal";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useMe } from "@/hooks/useMe";
import { resolvePageAction } from "@/app/lib/acx/action-map";
import { isAuthzV2Enabled } from "@/app/lib/acx/feature-flag";
import { deriveSidebarRoleGroup } from "@/lib/sidebar-visibility";
import { resolveToneClasses, type ColorTone } from "@/lib/theme-color";

export default function GeneralManagementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [adminSearch, setAdminSearch] = useState("");
  const [moduleSearch, setModuleSearch] = useState("");
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const { data: meData, isLoading: meLoading } = useMe();
  const authzV2Enabled = isAuthzV2Enabled();
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

  const hasPageAccess = useMemo(() => {
    if (!authzV2Enabled) return true;
    if (meLoading) return true;

    const page = resolvePageAction("/dashboard/genmgmt");
    if (!page) return true;

    const roles = (meData?.roles ?? []).map((role) => String(role).toUpperCase());
    const permissions = new Set<string>((meData?.permissions ?? []) as string[]);

    if (roles.includes("SUPER_ADMIN")) return true;
    if (roles.includes("ADMIN") && page.adminBaseline) return true;
    if (permissions.has("*")) return true;
    return permissions.has(page.action);
  }, [authzV2Enabled, meData?.permissions, meData?.roles, meLoading]);

  const roleGroup = useMemo(() => {
    return deriveSidebarRoleGroup({
      roles: meData?.roles ?? [],
      position: meData?.apt?.position ?? null,
    });
  }, [meData?.apt?.position, meData?.roles]);

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
  const filteredAcademicCards = useMemo(
    () => filterCards(academicManagementCards, moduleSearch),
    [moduleSearch]
  );
  const moduleQuery = moduleSearch.trim().toLowerCase();
  const showAcademicsGroup =
    !moduleQuery || moduleQuery.includes("academ") || filteredAcademicCards.length > 0;
  const academicCardsToShow =
    !moduleQuery || moduleQuery.includes("academ")
      ? academicManagementCards
      : filteredAcademicCards;

  useEffect(() => {
    if (!authzV2Enabled || meLoading) return;
    if (!hasPageAccess) {
      router.replace("/dashboard");
    }
  }, [authzV2Enabled, hasPageAccess, meLoading, router]);

  if (authzV2Enabled && !meLoading && !hasPageAccess) {
    return null;
  }

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
              <h2 className="text-2xl font-bold text-primary mb-2">
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
                  <div className="relative w-64">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md bg-primary/10 p-1">
                      <Search className="h-4 w-4 text-primary" />
                    </span>
                    <Input
                      placeholder="Search modules..."
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      className="w-full pl-10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-11 gap-y-6 mx-auto">
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
                          className="hover:shadow-lg transition-shadow duration-200 cursor-pointer border-l-4 border-l-primary"
                          onClick={() => setCourseModalOpen(true)}
                        >
                          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                            <div className={`${iconTone} p-2 rounded-lg`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <CardTitle className="text-lg font-semibold">{title}</CardTitle>

                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">{description}</p>
                          </CardContent>
                          <CardFooter>
                            <Button variant="outline" size="sm" className="w-full border-border cursor-pointer">
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
                  <div className="relative w-64">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md bg-primary/10 p-1">
                      <Search className="h-4 w-4 text-primary" />
                    </span>
                    <Input
                      placeholder="Search modules..."
                      value={moduleSearch}
                      onChange={(e) => setModuleSearch(e.target.value)}
                      className="w-full pl-10"
                    />
                  </div>
                </div>
                {showAcademicsGroup && (
                  <Card className="shadow-lg rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-foreground">
                        Academics Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-11 gap-y-6 mx-auto">
                        {academicCardsToShow.map((card, index) => {
                          const IconComponent = card.icon;
                          const isOfferings = card.title === "Offerings Management";
                          const tabbedTo = card.to ? withTab(card.to, activeTab) : card.to;
                          return (
                            <DashboardCard
                              key={`${card.title}-${index}`}
                              title={card.title}
                              description={card.description}
                              to={isOfferings ? undefined : tabbedTo}
                              icon={IconComponent}
                              color={card.color}
                              onClick={isOfferings ? () => setCourseModalOpen(true) : undefined}
                            />
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
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
                        color={card.color as ColorTone}
                      />
                    );
                  })}
                </div>
                {filteredModuleCards.length === 0 && !showAcademicsGroup && (
                  <p className="text-sm text-muted-foreground text-center">No modules found.</p>
                )}
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Admin Site Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Manage landing page content including logo, hero text, commanders, awards, and history.
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button asChild className="w-full">
                        <Link href="/dashboard/genmgmt/settings/site">Open Site Settings</Link>
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Device Site Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Configure theme, language, timezone, refresh interval, and layout density per device.
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button asChild className="w-full">
                        <Link href="/dashboard/settings/device">Open Device Settings</Link>
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Permission Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Manage roles, permissions, mappings, and field-level rules for user access control.
                      </p>
                    </CardContent>
                    <CardFooter>
                      {roleGroup === "ADMIN" || roleGroup === "SUPER_ADMIN" ? (
                        <Button asChild className="w-full">
                          <Link href="/dashboard/genmgmt/rbac">Open RBAC Management</Link>
                        </Button>
                      ) : (
                        <Button disabled className="w-full">
                          Restricted
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
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
