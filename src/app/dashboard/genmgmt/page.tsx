"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";

import { AppSidebar } from "@/components/AppSidebar";
import {
  SidebarProvider,
} from "@/components/ui/sidebar";

import { managementCard, managementTabs } from "@/config/app.config";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { TabsContent } from "@/components/ui/tabs";
import { DashboardCard } from "@/components/cards/DashboardCard";
import CourseSelectModal from "@/components/modals/CourseSelectModal";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function GeneralManagementPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [courseModalOpen, setCourseModalOpen] = useState(false);

  const handleLogout = () => {
    console.log("Logout clicked");
  };

  const handleCardClick = (to: string, title: string, e?: React.MouseEvent) => {
    // Check if this is the Offerings Management card
    if (title === "Offerings Management") {
      if (e) e.preventDefault();
      setCourseModalOpen(true);
    } else {
      router.push(to);
    }
  };

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

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <div className="text-center py-12">
                  <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    General Settings
                  </h3>
                  <p className="text-muted-foreground">
                    Manage system roles, permissions, and more.
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
        onSelect={(course) => router.push(`/dashboard/genmgmt/coursemgmt/${course.id}/offerings`)}
      />
    </SidebarProvider>
  );
}