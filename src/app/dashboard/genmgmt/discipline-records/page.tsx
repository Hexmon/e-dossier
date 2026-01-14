"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { SidebarProvider } from "@/components/ui/sidebar";
import DisciplineRecordsTable from "@/components/genmgmt/DisciplineRecordsTable";
import { useDisciplineRecordsAdmin, type AdminDisciplineRow } from "@/hooks/useDisciplineRecordsAdmin";
import { ocTabs } from "@/config/app.config";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { fetchMe, MeResponse } from "@/app/lib/api/me";
import { listAppointments } from "@/app/lib/api/AppointmentFilterApi";

export default function DisciplineRecordsManagementPage() {
    const router = useRouter();
    const { records, loading, fetchAll } = useDisciplineRecordsAdmin();
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<AdminDisciplineRow | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [checkingAdmin, setCheckingAdmin] = useState(true);
    const hasFetchedRef = useRef(false);

    // Check admin status
    useEffect(() => {
        const checkAdminStatus = async () => {
            setCheckingAdmin(true);
            try {
                const meData = await fetchMe();
                const userId = (meData.user as any)?.id || "";

                if (userId) {
                    const { appointments } = await listAppointments({ userId, active: true });
                    const activeAppointment = appointments.find(apt => !apt.endsAt) || appointments[0];
                    if (activeAppointment) {
                        const positionName = activeAppointment.positionName || "";
                        setIsAdmin(positionName.toLowerCase() === "admin");
                    } else {
                        setIsAdmin(false);
                    }
                } else {
                    setIsAdmin(false);
                }
            } catch (err) {
                console.error("Failed to check admin status:", err);
                setIsAdmin(false);
            } finally {
                setCheckingAdmin(false);
            }
        };

        checkAdminStatus();
    }, []);

    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchAll();
    }, []);

    const handleLogout = () => {
        console.log("Logout clicked");
        router.push("/login");
    };

    const handleEdit = (record: AdminDisciplineRow) => {
        if (!isAdmin) {
            toast.error("Admin privileges required");
            return;
        }
        // TODO: Implement edit functionality
        toast.info("Edit functionality not yet implemented");
    };

    const handleDelete = (record: AdminDisciplineRow) => {
        if (!isAdmin) {
            toast.error("Admin privileges required");
            return;
        }
        setRecordToDelete(record);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!recordToDelete) return;

        // TODO: Implement delete API call
        toast.info("Delete functionality not yet implemented");

        setDeleteConfirmOpen(false);
        setRecordToDelete(null);
    };



    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />

                <div className="flex-1 flex flex-col">
                    <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
                        <PageHeader
                            title="Discipline Records Management"
                            description="View and manage all discipline records across OCs"
                            onLogout={handleLogout}
                        />
                    </header>

                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Gen Mgmt", href: "/dashboard/genmgmt" },
                                { label: "Discipline Records" },
                            ]}
                        />

                        <GlobalTabs tabs={ocTabs} defaultValue="discipline-records">
                            <TabsContent value="discipline-records" className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-foreground">All Discipline Records</h2>

                                </div>

                                <DisciplineRecordsTable
                                    rows={records}
                                    loading={loading}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    isAdmin={isAdmin}
                                />
                            </TabsContent>
                        </GlobalTabs>
                    </main>
                </div>
            </div>

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the discipline record
                            for {recordToDelete?.ocName} ({recordToDelete?.ocNo}).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRecordToDelete(null)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </SidebarProvider>
    );
}