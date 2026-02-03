"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { fetchMe } from "@/app/lib/api/me";
import { listAppointments } from "@/app/lib/api/AppointmentFilterApi";

export default function DisciplineRecordsManagementPage() {
    const router = useRouter();
    const { records, loading, updateRecord, deleteRecord } = useDisciplineRecordsAdmin();
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<AdminDisciplineRow | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [recordToEdit, setRecordToEdit] = useState<AdminDisciplineRow | null>(null);
    const [editForm, setEditForm] = useState({
        semester: "",
        dateOfOffence: "",
        offence: "",
        punishmentAwarded: "",
        awardedOn: "",
        awardedBy: "",
        pointsDelta: "",
    });
    const [isAdmin, setIsAdmin] = useState(false);
    const [checkingAdmin, setCheckingAdmin] = useState(true);

    useEffect(() => {
        const checkAdminStatus = async () => {
            setCheckingAdmin(true);
            try {
                const meData = await fetchMe();
                const userId = (meData.user as any)?.id || "";

                if (userId) {
                    const { appointments } = await listAppointments({ userId, active: true });
                    const activeAppointment = appointments.find((apt) => !apt.endsAt) || appointments[0];
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

    const handleLogout = () => {
        console.log("Logout clicked");
        router.push("/login");
    };

    const handleEdit = (record: AdminDisciplineRow) => {
        if (!isAdmin) {
            toast.error("Admin privileges required");
            return;
        }
        setRecordToEdit(record);
        setEditForm({
            semester: record.semester?.toString() || "",
            dateOfOffence: record.dateOfOffence || "",
            offence: record.offence || "",
            punishmentAwarded: record.punishment || "",
            awardedOn: record.dateOfAward || "",
            awardedBy: record.byWhomAwarded || "",
            pointsDelta: record.points?.toString() || "",
        });
        setEditModalOpen(true);
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

        await deleteRecord(recordToDelete.id);

        setDeleteConfirmOpen(false);
        setRecordToDelete(null);
    };

    const handleSaveEdit = async () => {
        if (!recordToEdit) return;

        const payload = {
            semester: parseInt(editForm.semester),
            dateOfOffence: editForm.dateOfOffence,
            offence: editForm.offence,
            punishmentAwarded: editForm.punishmentAwarded || null,
            awardedOn: editForm.awardedOn || null,
            awardedBy: editForm.awardedBy || null,
            pointsDelta: editForm.pointsDelta ? parseInt(editForm.pointsDelta) : 0,
        };

        await updateRecord(recordToEdit.id, payload);

        setEditModalOpen(false);
        setRecordToEdit(null);
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
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Discipline Record</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="semester">Semester</Label>
                            <Input
                                id="semester"
                                type="number"
                                value={editForm.semester}
                                onChange={(e) => setEditForm({ ...editForm, semester: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="dateOfOffence">Date of Offence</Label>
                            <Input
                                id="dateOfOffence"
                                type="date"
                                value={editForm.dateOfOffence}
                                onChange={(e) => setEditForm({ ...editForm, dateOfOffence: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="offence">Offence</Label>
                            <Textarea
                                id="offence"
                                value={editForm.offence}
                                onChange={(e) => setEditForm({ ...editForm, offence: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="punishmentAwarded">Punishment Awarded</Label>
                            <Input
                                id="punishmentAwarded"
                                value={editForm.punishmentAwarded}
                                onChange={(e) => setEditForm({ ...editForm, punishmentAwarded: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="awardedOn">Awarded On</Label>
                            <Input
                                id="awardedOn"
                                type="date"
                                value={editForm.awardedOn}
                                onChange={(e) => setEditForm({ ...editForm, awardedOn: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="awardedBy">Awarded By</Label>
                            <Input
                                id="awardedBy"
                                value={editForm.awardedBy}
                                onChange={(e) => setEditForm({ ...editForm, awardedBy: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="pointsDelta">Points</Label>
                            <Input
                                id="pointsDelta"
                                type="number"
                                value={editForm.pointsDelta}
                                onChange={(e) => setEditForm({ ...editForm, pointsDelta: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </SidebarProvider>
    );
}