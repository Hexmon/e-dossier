"use client";

import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { TabsContent } from "@/components/ui/tabs";
import { SidebarProvider } from "@/components/ui/sidebar";
import { moduleManagementTabs, ocTabs } from "@/config/app.config";
import RelegationForm from "@/components/relegation/RelegationForm";

export default function RelegationPage() {
    const router = useRouter();

    const handleLogout = () => {
        router.push("/login");
    };

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />

                <div className="flex-1 flex flex-col">
                    <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
                        <PageHeader
                            title="Relegation"
                            description="Submit a relegation request"
                            onLogout={handleLogout}
                        />
                    </header>

                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Gen Mgmt", href: "/dashboard/genmgmt" },
                                { label: "Relegation" },
                            ]}
                        />

                        <GlobalTabs tabs={moduleManagementTabs} defaultValue="relegation">
                            <TabsContent value="relegation" className="space-y-6">
                                <main className="bg-white rounded-2xl p-5">
                                    <div className="flex items-center justify-center">
                                        <h2 className="text-2xl font-bold text-foreground mb-5 mt-4 bg-blue-200 w-2xl text-center rounded-2xl">
                                            Relegation Form
                                        </h2>
                                    </div>

                                    <div className="flex justify-center items-center">
                                        <RelegationForm />
                                    </div>
                                </main>
                            </TabsContent>
                        </GlobalTabs>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
