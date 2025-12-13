"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";

import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import {
  SidebarProvider,
} from "@/components/ui/sidebar";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { managementCard, managementTabs } from "@/config/app.config";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { TabsContent } from "@/components/ui/tabs";
import { DashboardCard } from "@/components/cards/DashboardCard";

export default function GeneralManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = () => {
    console.log("Logout clicked");
  };

  return (
    <SidebarProvider>
      <main className="min-h-screen flex w-full bg-background">
        <aside><AppSidebar /></aside>

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header>
            <PageHeader
              title="General Management"
              description="Manage user access and roles in MCEME"
            />
          </header>

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
              <h2 className="text-2xl font-bold text-primary mb-2">
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
    </SidebarProvider>
  );
}
