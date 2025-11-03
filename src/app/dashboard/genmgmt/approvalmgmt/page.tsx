"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { FALLBACK_PENDING_USERS, FALLBACK_SLOTS, ocTabs } from "@/config/app.config";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TabsContent } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { approveSignupRequest, getAvailableSlots, getPendingUsers, PendingUser, PositionSlot, rejectSignupRequest } from "@/app/lib/api/ApprovalApi";
import { ApprovalForm } from "@/types/approvalmgmt";


export default function ApprovalManagement() {
    const router = useRouter();
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [slots, setSlots] = useState<PositionSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { register, setValue, getValues } = useForm<ApprovalForm>();

    const availableSlots = useMemo(
        () => slots.filter((s) => !s.occupied),
        [slots]
    );

    // --- Fetch users + slots
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [users, slotList] = await Promise.all([
                getPendingUsers(),
                getAvailableSlots(),
            ]);
            setPendingUsers(users);
            setSlots(slotList);
        } catch (err: any) {
            console.warn("API failed, using fallback data.");
            toast.warning("Using fallback data due to API failure.");
            setError("Unable to load live data — showing fallback users.");
            setPendingUsers(FALLBACK_PENDING_USERS);
            setSlots(FALLBACK_SLOTS);
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Approve user
    const handleApprove = useCallback(async (user: PendingUser) => {
        const selectedKey = getValues()[user.username];
        const selectedSlot = availableSlots.find(
            (s) => s.position.key === selectedKey
        );

        if (!selectedKey || !selectedSlot) {
            toast.error("Please select an appointment before approving.");
            return;
        }

        try {
            const scopeType: "GLOBAL" | "PLATOON" =
                selectedSlot.scope.type === "GLOBAL" || selectedSlot.scope.type === "PLATOON"
                    ? selectedSlot.scope.type
                    : "GLOBAL";
            const res = await approveSignupRequest(user.id, selectedKey, scopeType);
            toast.success(res.message || `${user.name} approved successfully.`);
            setPendingUsers((prev) => prev.filter((u) => u.id !== user.id));
        } catch (err: any) {
            toast.error(err.message || "Failed to approve user.");
        }
    }, [availableSlots, getValues]);

    // --- Reject user
    const handleReject = useCallback(async (user: PendingUser) => {
        try {
            const res = await rejectSignupRequest(user.id);
            toast.error(res.message || `${user.name} rejected.`);
            setPendingUsers((prev) => prev.filter((u) => u.id !== user.id));
        } catch (err: any) {
            toast.error(err.message || "Failed to reject user.");
        }
    }, []);

    const handleLogout = () => router.push("/login");

    return (
        <SidebarProvider>
            <section className="min-h-screen flex w-full bg-background">
                <aside><AppSidebar /></aside>
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
                                <h2 className="text-2xl font-bold text-foreground">
                                    Pending Approvals
                                </h2>

                                {loading ? (
                                    <p className="text-center p-4 text-muted-foreground">
                                        Loading pending users...
                                    </p>
                                ) : (
                                    <form className="divide-y border rounded-md">
                                        {pendingUsers.map((user) => (
                                            <div
                                                key={user.id}
                                                className="p-4 flex items-center justify-between"
                                            >
                                                {/* --- User Info --- */}
                                                <div>
                                                    <p className="font-semibold">{user.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {user.rank} • {user.email} • {user.phone}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {user.username}
                                                    </p>
                                                </div>

                                                {/* --- Actions --- */}
                                                <div className="flex items-center gap-3">
                                                    <Select
                                                        onValueChange={(val) => setValue(user.username, val)}
                                                    >
                                                        <SelectTrigger className="w-[200px]">
                                                            <SelectValue placeholder="Select Appointment" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {[...new Map(
                                                                slots.map(slot => [slot.position.key, slot])
                                                            ).values()].map((slot) => (
                                                                <SelectItem
                                                                    key={slot.position.key}
                                                                    value={slot.position.key}
                                                                >
                                                                    {slot.position.displayName}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>

                                                    </Select>

                                                    <Button
                                                        type="button"
                                                        variant="default"
                                                        onClick={() => handleApprove(user)}
                                                        aria-label={`Approve ${user.name}`}
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        onClick={() => handleReject(user)}
                                                        aria-label={`Reject ${user.name}`}
                                                    >
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
                                    </form>
                                )}
                            </TabsContent>
                        </GlobalTabs>
                    </main>
                </div>
            </section>
        </SidebarProvider>
    );
}
