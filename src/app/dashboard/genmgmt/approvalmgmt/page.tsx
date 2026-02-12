"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { TabsContent } from "@/components/ui/tabs";
import { ocTabs } from "@/config/app.config";

import { useApproval } from "@/hooks/useApproval";
import { PendingUserItem } from "@/components/approval/PendingUserItem";
import type { PendingUser } from "@/app/lib/api/ApprovalApi";

export default function ApprovalManagement() {
    const router = useRouter();

    const {
        pendingUsers,
        availableSlots,
        loading,
        approve,
        reject,
    } = useApproval();

    const [selectedSlots, setSelectedSlots] = useState<Record<string, string>>({});

    const handleLogout = () => router.push("/login");

    return (
        <SidebarProvider>
            <section className="min-h-screen flex w-full bg-background">
                <AppSidebar />

                <div className="flex-1 flex flex-col">
                    <header className="h-16 border-b bg-card/50 backdrop-blur sticky top-0 z-50">
                        <PageHeader
                            title="Approval Management"
                            description="Approve or reject pending user requests"
                            onLogout={handleLogout}
                        />
                    </header>

                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Admin Mgmt", href: "/dashboard/genmgmt" },
                                { label: "Approval Management" },
                            ]}
                        />

                        <GlobalTabs tabs={ocTabs} defaultValue="approval-mgmt">
                            <TabsContent value="approval-mgmt" className="space-y-6">
                                <h2 className="text-2xl font-bold">Pending Approvals</h2>

                                {loading && (
                                    <p className="text-muted-foreground text-center p-4">
                                        Loading pending users…
                                    </p>
                                )}

                                {!loading && pendingUsers.length === 0 && (
                                    <p className="text-muted-foreground text-center p-4">
                                        No pending approval requests.
                                    </p>
                                )}

                                {!loading &&
                                    pendingUsers.map((user) => {
                                        const selected = selectedSlots[user.id] || "";

                                        return (
                                            <PendingUserItem
                                                key={user.id}
                                                user={user}
                                                slots={availableSlots}
                                                onSelectSlot={(slotKey) =>
                                                    setSelectedSlots((prev) => ({
                                                        ...prev,
                                                        [user.id]: slotKey,
                                                    }))
                                                }
                                                onApprove={() => approve(user, selected)}
                                                onReject={() => reject(user)}
                                            />
                                        );
                                    })}
                            </TabsContent>
                        </GlobalTabs>
                    </main>
                </div>
            </section>
        </SidebarProvider>
    );
}