"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/useMe";
import { resolvePageAction } from "@/app/lib/acx/action-map";
import { isAuthzV2Enabled } from "@/app/lib/acx/feature-flag";
import { deriveSidebarRoleGroup } from "@/lib/sidebar-visibility";

export default function GeneralManagementPage() {
  const router = useRouter();
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const { data: meData, isLoading: meLoading } = useMe();
  const authzV2Enabled = isAuthzV2Enabled();

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
                  { label: "Admin Mgmt" },
                ]}
              />
            </nav>
            {/* Welcome section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#1677ff] mb-2">
                Admin Management
              </h2>
              <p className="text-muted-foreground">
                Centralize and oversee administrative processes, ensuring smooth coordination of all training and institutional activities.
              </p>
            </div>

            {/* Tabs Section */}
            <GlobalTabs defaultValue="Gen Mgmt" tabs={managementTabs}>
              {/* General Management Tab */}
              <TabsContent value="Gen Mgmt" className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-11 gap-y-6 mx-auto">
                  {managementCard.map((card, index) => {
                    const IconComponent = card.icon;
                    const { title = "", description = "", to = "", color = "" } = card;

                    if (title === "Offerings Management") {
                      return (
                        <Card
                          key={index}
                          className="hover:shadow-lg transition-shadow duration-200 cursor-pointer border-l-4"
                          style={{ borderLeftColor: color }}
                          onClick={() => setCourseModalOpen(true)}
                        >
                          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                            <div className={`${color} p-2 rounded-lg`}>
                              <IconComponent className="h-5 w-5 text-white" />
                            </div>
                            <CardTitle className="text-lg font-semibold">{title}</CardTitle>

                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">{description}</p>
                          </CardContent>
                          <CardFooter>
                            <Button variant="outline" size="sm" className="w-full border border-blue-700 cursor-pointer">
                              Access Module →
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
                        to={to}
                        icon={IconComponent}
                        color={color}
                      />
                    );
                  })}
                </div>
              </TabsContent>
              {/* Module Management Tab */}
              <TabsContent value="module-mgmt" className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-11 gap-y-6 mx-auto">
                  {moduleManagementCard.map((card, index) => {
                    const IconComponent = card.icon;

                    return (
                      <DashboardCard
                        key={index}
                        title={card.title}
                        description={card.description}
                        to={card.to}
                        icon={IconComponent}
                        color={card.color}
                      />
                    );
                  })}
                </div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
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
        onSelect={(course) => router.push(`/dashboard/genmgmt/coursemgmt/${course.id}/offerings`)}
      />
    </SidebarProvider>
  );
}
