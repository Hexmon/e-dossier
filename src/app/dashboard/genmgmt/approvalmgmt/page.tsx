"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { ocTabs } from "@/config/app.config";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { baseURL, endpoints } from "@/constants/endpoints";
import { api } from "@/app/lib/apiClient";
import { toast } from "sonner";

type PendingUser = {
    id: string;
    username: string;
    name: string;
    rank: string;
    email: string;
    phone: string;
    unit?: string;
    note?: string;
    desiredPositionName?: string;
};

export default function ApprovalManagement() {
    const router = useRouter();
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<{ [key: string]: string }>({});
    const [viewUser, setViewUser] = useState<PendingUser | null>(null);
    const [viewOpen, setViewOpen] = useState(false);

    // --- Fetch pending signup requests ---
    useEffect(() => {
        const fetchPendingUsers = async () => {
            try {
                setLoading(true);
                const data = await api.get<{ items: PendingUser[] }>(endpoints.admin.approval, {
                    baseURL,
                    query: { status: "pending", limit: 50 },
                });
                setPendingUsers(data.items || []);
            } catch (err: any) {
                console.warn("Live API failed, loading mock data from localStorage...");

                const stored = localStorage.getItem("pendingUsers");
                if (stored) {
                    const parsed = JSON.parse(stored);
                    setPendingUsers(parsed.items || []);
                } else {
                    setPendingUsers([
                        {
                            id: "970ffcca-3f7a-4191-b057-e02626d1b7f0",
                            username: "alice",
                            name: "Alice Roy",
                            email: "alice@example.com",
                            phone: "+91-9999999999",
                            rank: "Major",
                            note: "Please approve my account",
                        },
                    ]);
                }

                // console.error("Error fetching pending users:", err);
                // setError(err.message || "Failed to load pending requests.");
            } finally {
                setLoading(false);
            }
        };

        fetchPendingUsers();
    }, []);

    const handleLogout = () => {
        router.push("/login");
    };

    const handleApprove = (index: number) => {
        const user = pendingUsers[index];
        const appointment = selectedAppointment[user.username] || "Not Assigned";

        toast.success(`${user.name} approved as ${appointment}`);

        // Optimistically remove the user from pending list
        const updatedUsers = [...pendingUsers];
        updatedUsers.splice(index, 1);
        setPendingUsers(updatedUsers);
    };

    const handleReject = (index: number) => {
        const user = pendingUsers[index];

        toast.error(`${user.name}'s registration request rejected.`);

        // Optimistically remove from list
        const updatedUsers = [...pendingUsers];
        updatedUsers.splice(index, 1);
        setPendingUsers(updatedUsers);
    };


    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />

                <div className="flex-1 flex flex-col">
                    <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
                        <PageHeader
                            title="Approval Management"
                            description="Approve or reject pending user registration requests"
                            onLogout={handleLogout}
                        />
                    </header>

                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Gen Mgmt", href: "/dashboard/genmgmt" },
                                { label: "Approval Management" },
                            ]}
                        />

                        <GlobalTabs tabs={ocTabs} defaultValue="approval-mgmt">
                            <TabsContent value="approval-mgmt" className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-foreground">Pending Approvals</h2>
                                </div>

                                {loading ? (
                                    <p className="p-4 text-center text-muted-foreground">Loading pending users...</p>
                                ) : error ? (
                                    <p className="p-4 text-center text-red-500">{error}</p>
                                ) : (
                                    <div className="divide-y border rounded-md">
                                        {pendingUsers.map((user, index) => (
                                            <div key={user.id} className="p-4 flex items-center justify-between">
                                                <div>
                                                    <p className="font-semibold">{user.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {user.rank} • {user.email} • {user.phone}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">{user.username}</p>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <Select
                                                        onValueChange={(val) =>
                                                            setSelectedAppointment((prev) => ({
                                                                ...prev,
                                                                [user.username]: val,
                                                            }))
                                                        }
                                                    >
                                                        <SelectTrigger className="w-[180px]">
                                                            <SelectValue placeholder="Select Appointment" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {[
                                                                "Comdt",
                                                                "DCCI",
                                                                "Cdr CTW",
                                                                "DyCdr CTW",
                                                                "DS Cord",
                                                                "HOAT",
                                                                "Platoon Cdr",
                                                                "CCO",
                                                            ].map((role) => (
                                                                <SelectItem key={role} value={role}>
                                                                    {role}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>

                                                    <Button variant="default" onClick={() => handleApprove(index)}>
                                                        Approve
                                                    </Button>
                                                    <Button variant="destructive" onClick={() => handleReject(index)}>
                                                        Reject
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}

                                        {pendingUsers.length === 0 && (
                                            <p className="p-4 text-center text-muted-foreground">
                                                No pending approval requests.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </TabsContent>
                        </GlobalTabs>
                    </main>
                </div>
            </div>

            {/* View User Details Dialog */}
            <Dialog open={viewOpen} onOpenChange={setViewOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>User Details</DialogTitle>
                    </DialogHeader>
                    {viewUser && (
                        <div className="space-y-2">
                            <p><b>Username:</b> {viewUser.username}</p>
                            <p><b>Name:</b> {viewUser.name}</p>
                            <p><b>Rank:</b> {viewUser.rank}</p>
                            <p><b>Email:</b> {viewUser.email}</p>
                            <p><b>Phone:</b> {viewUser.phone}</p>
                            <p><b>Note:</b> {viewUser.note}</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </SidebarProvider>
    );
}
