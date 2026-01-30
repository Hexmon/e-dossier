"use client";

import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useRouter } from "next/navigation";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { TabsContent } from "@/components/ui/tabs";
import { ocTabs } from "@/config/app.config";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import CampDialog from "@/components/camps/CampDialog";
import CampsTable from "@/components/camps/CampsTable";
import DeleteCampDialog from "@/components/camps/DeleteCampDialog";
import { CampFormData } from "@/components/camps/CampForm";
import ActivityDialog from "@/components/camps/ActivityDialog";
import DeleteActivityDialog from "@/components/camps/DeleteActivityDialog";
import { ActivityFormData } from "@/components/camps/ActivityForm";
import {
    fetchTrainingCamps,
    createTrainingCamp,
    updateTrainingCamp,
    deleteTrainingCamp,
    TrainingCamp
} from "@/app/lib/api/trainingCampsApi";
import {
    createTrainingCampActivity,
    updateTrainingCampActivity,
    deleteTrainingCampActivity,
    TrainingCampActivity
} from "@/app/lib/api/trainingCampActivitiesApi";
import { toast } from "sonner";


export default function CampsManagement() {
    const router = useRouter();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [camps, setCamps] = useState<TrainingCamp[]>([]);
    const [isFetchingCamps, setIsFetchingCamps] = useState(true);
    const [editingCamp, setEditingCamp] = useState<TrainingCamp | null>(null);
    const [deletingCamp, setDeletingCamp] = useState<TrainingCamp | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Activity management state
    const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
    const [currentCamp, setCurrentCamp] = useState<TrainingCamp | null>(null);
    const [editingActivity, setEditingActivity] = useState<TrainingCampActivity | null>(null);
    const [deletingActivity, setDeletingActivity] = useState<TrainingCampActivity | null>(null);
    const [isDeleteActivityDialogOpen, setIsDeleteActivityDialogOpen] = useState(false);

    const handleLogout = () => router.push("/login");

    // Fetch camps on component mount
    useEffect(() => {
        loadCamps();
    }, []);

    const loadCamps = async () => {
        try {
            setIsFetchingCamps(true);
            const data = await fetchTrainingCamps({ includeActivities: true });
            setCamps(data);
        } catch (error) {
            toast.error("Failed to load camps");
        } finally {
            setIsFetchingCamps(false);
        }
    };

    const handleCreateCamp = async (formData: CampFormData) => {
        try {
            setIsLoading(true);
            await createTrainingCamp(formData);
            toast.success("Camp created successfully!");
            setIsDialogOpen(false);
            // Reload camps list
            await loadCamps();
        } catch (error: any) {
            toast.error(error.message || "Failed to create camp");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditCamp = (camp: TrainingCamp) => {
        setEditingCamp(camp);
        setIsDialogOpen(true);
    };

    const handleUpdateCamp = async (formData: CampFormData) => {
        if (!editingCamp) return;

        try {
            setIsLoading(true);
            await updateTrainingCamp(editingCamp.id, formData);
            toast.success("Camp updated successfully!");
            setIsDialogOpen(false);
            setEditingCamp(null);
            // Reload camps list
            await loadCamps();
        } catch (error: any) {
            toast.error(error.message || "Failed to update camp");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = (camp: TrainingCamp) => {
        setDeletingCamp(camp);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deletingCamp) return;

        try {
            setIsLoading(true);
            await deleteTrainingCamp(deletingCamp.id, false); // soft delete
            toast.success("Camp deleted successfully!");
            setIsDeleteDialogOpen(false);
            setDeletingCamp(null);
            // Reload camps list
            await loadCamps();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete camp");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDialogClose = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) {
            setEditingCamp(null);
        }
    };

    // Activity handlers
    const handleAddActivity = (camp: TrainingCamp) => {
        setCurrentCamp(camp);
        setEditingActivity(null);
        setIsActivityDialogOpen(true);
    };

    const handleEditActivity = (camp: TrainingCamp, activity: TrainingCampActivity) => {
        setCurrentCamp(camp);
        setEditingActivity(activity);
        setIsActivityDialogOpen(true);
    };

    const handleDeleteActivityClick = (camp: TrainingCamp, activity: TrainingCampActivity) => {
        setCurrentCamp(camp);
        setDeletingActivity(activity);
        setIsDeleteActivityDialogOpen(true);
    };

    const handleCreateActivity = async (formData: ActivityFormData) => {
        if (!currentCamp) return;
        try {
            setIsLoading(true);
            await createTrainingCampActivity(currentCamp.id, formData);
            toast.success("Activity created successfully!");
            setIsActivityDialogOpen(false);
            setCurrentCamp(null);
            await loadCamps();
        } catch (error: any) {
            toast.error(error.message || "Failed to create activity");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateActivity = async (formData: ActivityFormData) => {
        if (!currentCamp || !editingActivity) return;
        try {
            setIsLoading(true);
            await updateTrainingCampActivity(currentCamp.id, editingActivity.id, formData);
            toast.success("Activity updated successfully!");
            setIsActivityDialogOpen(false);
            setEditingActivity(null);
            setCurrentCamp(null);
            await loadCamps();
        } catch (error: any) {
            toast.error(error.message || "Failed to update activity");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteActivityConfirm = async () => {
        if (!currentCamp || !deletingActivity) return;
        try {
            setIsLoading(true);
            await deleteTrainingCampActivity(currentCamp.id, deletingActivity.id, false);
            toast.success("Activity deleted successfully!");
            setIsDeleteActivityDialogOpen(false);
            setDeletingActivity(null);
            setCurrentCamp(null);
            await loadCamps();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete activity");
        } finally {
            setIsLoading(false);
        }
    };

    const handleActivityDialogClose = (open: boolean) => {
        setIsActivityDialogOpen(open);
        if (!open) {
            setEditingActivity(null);
            setCurrentCamp(null);
        }
    };

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />
                <div className="flex-1 flex flex-col">
                    <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
                        <PageHeader
                            title="Camps Management"
                            description="Manage camps and their assignments"
                            onLogout={handleLogout}
                        />
                    </header>
                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Gen Mgmt", href: "/dashboard/genmgmt" },
                                { label: "Camps Management" },
                            ]}
                        />

                        <GlobalTabs tabs={ocTabs} defaultValue="camp-mgmt">
                            <TabsContent value="camp-mgmt" className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold">Manage Camps</h2>
                                    <Button
                                        onClick={() => setIsDialogOpen(true)}
                                        className="bg-blue-500 hover:bg-blue-600"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create Camp
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    <CampsTable
                                        camps={camps}
                                        loading={isFetchingCamps}
                                        onEdit={handleEditCamp}
                                        onDelete={handleDeleteClick}
                                        onAddActivity={handleAddActivity}
                                        onEditActivity={handleEditActivity}
                                        onDeleteActivity={handleDeleteActivityClick}
                                    />
                                </div>
                            </TabsContent>
                        </GlobalTabs>
                    </main>
                </div>
            </div>

            {/* Create/Edit Camp Dialog */}
            <CampDialog
                isOpen={isDialogOpen}
                onOpenChange={handleDialogClose}
                onSubmit={editingCamp ? handleUpdateCamp : handleCreateCamp}
                isLoading={isLoading}
                initialData={editingCamp ? {
                    name: editingCamp.name,
                    semester: editingCamp.semester,
                    maxTotalMarks: editingCamp.maxTotalMarks,
                } : undefined}
                mode={editingCamp ? "edit" : "create"}
            />

            {/* Delete Camp Dialog */}
            <DeleteCampDialog
                isOpen={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={handleDeleteConfirm}
                camp={deletingCamp}
                isLoading={isLoading}
            />

            {/* Create/Edit Activity Dialog */}
            <ActivityDialog
                isOpen={isActivityDialogOpen}
                onOpenChange={handleActivityDialogClose}
                onSubmit={editingActivity ? handleUpdateActivity : handleCreateActivity}
                isLoading={isLoading}
                initialData={editingActivity ? {
                    name: editingActivity.name,
                    defaultMaxMarks: editingActivity.defaultMaxMarks,
                    sortOrder: editingActivity.sortOrder,
                } : undefined}
                mode={editingActivity ? "edit" : "create"}
                campName={currentCamp?.name}
            />

            {/* Delete Activity Dialog */}
            <DeleteActivityDialog
                isOpen={isDeleteActivityDialogOpen}
                onOpenChange={setIsDeleteActivityDialogOpen}
                onConfirm={handleDeleteActivityConfirm}
                activity={deletingActivity}
                isLoading={isLoading}
            />
        </SidebarProvider>
    )
}