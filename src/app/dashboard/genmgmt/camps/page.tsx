"use client";

import React, { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { useRouter } from "next/navigation";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { TabsContent } from "@/components/ui/tabs";
import { moduleManagementTabs, ocTabs } from "@/config/app.config";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import CampDialog from "@/components/camps/CampDialog";
import CampsTable from "@/components/camps/CampsTable";
import DeleteCampDialog from "@/components/camps/DeleteCampDialog";
import { CampFormData } from "@/components/camps/CampForm";
import ActivityDialog from "@/components/camps/ActivityDialog";
import DeleteActivityDialog from "@/components/camps/DeleteActivityDialog";
import { ActivityFormData } from "@/components/camps/ActivityForm";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchTrainingCamps,
    createTrainingCamp,
    updateTrainingCamp,
    deleteTrainingCamp,
    TrainingCamp,
} from "@/app/lib/api/trainingCampsApi";
import {
    createTrainingCampActivity,
    updateTrainingCampActivity,
    deleteTrainingCampActivity,
    TrainingCampActivity,
} from "@/app/lib/api/trainingCampActivitiesApi";
import { toast } from "sonner";

export default function CampsManagement() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCamp, setEditingCamp] = useState<TrainingCamp | null>(null);
    const [deletingCamp, setDeletingCamp] = useState<TrainingCamp | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
    const [currentCamp, setCurrentCamp] = useState<TrainingCamp | null>(null);
    const [editingActivity, setEditingActivity] = useState<TrainingCampActivity | null>(null);
    const [deletingActivity, setDeletingActivity] = useState<TrainingCampActivity | null>(null);
    const [isDeleteActivityDialogOpen, setIsDeleteActivityDialogOpen] = useState(false);

    const { data: camps = [], isLoading: isFetchingCamps } = useQuery({
        queryKey: ["trainingCamps"],
        queryFn: async () => {
            const data = await fetchTrainingCamps({ includeActivities: true });
            return data;
        },
        staleTime: 5 * 60 * 1000,
    });

    const createCampMutation = useMutation({
        mutationFn: createTrainingCamp,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trainingCamps"] });
            toast.success("Camp created successfully!");
            setIsDialogOpen(false);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to create camp");
        },
    });

    const updateCampMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: CampFormData }) =>
            updateTrainingCamp(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trainingCamps"] });
            toast.success("Camp updated successfully!");
            setIsDialogOpen(false);
            setEditingCamp(null);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to update camp");
        },
    });

    const deleteCampMutation = useMutation({
        mutationFn: (id: string) => deleteTrainingCamp(id, false),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trainingCamps"] });
            toast.success("Camp deleted successfully!");
            setIsDeleteDialogOpen(false);
            setDeletingCamp(null);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete camp");
        },
    });

    const createActivityMutation = useMutation({
        mutationFn: ({ campId, data }: { campId: string; data: ActivityFormData }) =>
            createTrainingCampActivity(campId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trainingCamps"] });
            toast.success("Activity created successfully!");
            setIsActivityDialogOpen(false);
            setCurrentCamp(null);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to create activity");
        },
    });

    const updateActivityMutation = useMutation({
        mutationFn: ({
            campId,
            activityId,
            data,
        }: {
            campId: string;
            activityId: string;
            data: ActivityFormData;
        }) => updateTrainingCampActivity(campId, activityId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trainingCamps"] });
            toast.success("Activity updated successfully!");
            setIsActivityDialogOpen(false);
            setEditingActivity(null);
            setCurrentCamp(null);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to update activity");
        },
    });

    const deleteActivityMutation = useMutation({
        mutationFn: ({ campId, activityId }: { campId: string; activityId: string }) =>
            deleteTrainingCampActivity(campId, activityId, false),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trainingCamps"] });
            toast.success("Activity deleted successfully!");
            setIsDeleteActivityDialogOpen(false);
            setDeletingActivity(null);
            setCurrentCamp(null);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete activity");
        },
    });

    const handleLogout = () => router.push("/login");

    const handleCreateCamp = async (formData: CampFormData) => {
        await createCampMutation.mutateAsync(formData);
    };

    const handleEditCamp = (camp: TrainingCamp) => {
        setEditingCamp(camp);
        setIsDialogOpen(true);
    };

    const handleUpdateCamp = async (formData: CampFormData) => {
        if (!editingCamp) return;
        await updateCampMutation.mutateAsync({ id: editingCamp.id, data: formData });
    };

    const handleDeleteClick = (camp: TrainingCamp) => {
        setDeletingCamp(camp);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deletingCamp) return;
        await deleteCampMutation.mutateAsync(deletingCamp.id);
    };

    const handleDialogClose = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) {
            setEditingCamp(null);
        }
    };

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

    const handleDeleteActivityClick = (
        camp: TrainingCamp,
        activity: TrainingCampActivity
    ) => {
        setCurrentCamp(camp);
        setDeletingActivity(activity);
        setIsDeleteActivityDialogOpen(true);
    };

    const handleCreateActivity = async (formData: ActivityFormData) => {
        if (!currentCamp) return;
        await createActivityMutation.mutateAsync({ campId: currentCamp.id, data: formData });
    };

    const handleUpdateActivity = async (formData: ActivityFormData) => {
        if (!currentCamp || !editingActivity) return;
        await updateActivityMutation.mutateAsync({
            campId: currentCamp.id,
            activityId: editingActivity.id,
            data: formData,
        });
    };

    const handleDeleteActivityConfirm = async () => {
        if (!currentCamp || !deletingActivity) return;
        await deleteActivityMutation.mutateAsync({
            campId: currentCamp.id,
            activityId: deletingActivity.id,
        });
    };

    const handleActivityDialogClose = (open: boolean) => {
        setIsActivityDialogOpen(open);
        if (!open) {
            setEditingActivity(null);
            setCurrentCamp(null);
        }
    };

    const isLoading =
        createCampMutation.isPending ||
        updateCampMutation.isPending ||
        deleteCampMutation.isPending ||
        createActivityMutation.isPending ||
        updateActivityMutation.isPending ||
        deleteActivityMutation.isPending;

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

                        <GlobalTabs tabs={moduleManagementTabs} defaultValue="camps">
                            <TabsContent value="camps" className="space-y-6">
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

            <CampDialog
                isOpen={isDialogOpen}
                onOpenChange={handleDialogClose}
                onSubmit={editingCamp ? handleUpdateCamp : handleCreateCamp}
                isLoading={isLoading}
                initialData={
                    editingCamp
                        ? {
                            name: editingCamp.name,
                            semester: editingCamp.semester,
                            maxTotalMarks: editingCamp.maxTotalMarks,
                        }
                        : undefined
                }
                mode={editingCamp ? "edit" : "create"}
            />

            <DeleteCampDialog
                isOpen={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={handleDeleteConfirm}
                camp={deletingCamp}
                isLoading={isLoading}
            />

            <ActivityDialog
                isOpen={isActivityDialogOpen}
                onOpenChange={handleActivityDialogClose}
                onSubmit={editingActivity ? handleUpdateActivity : handleCreateActivity}
                isLoading={isLoading}
                initialData={
                    editingActivity
                        ? {
                            name: editingActivity.name,
                            defaultMaxMarks: editingActivity.defaultMaxMarks,
                            sortOrder: editingActivity.sortOrder,
                        }
                        : undefined
                }
                mode={editingActivity ? "edit" : "create"}
                campName={currentCamp?.name}
            />

            <DeleteActivityDialog
                isOpen={isDeleteActivityDialogOpen}
                onOpenChange={setIsDeleteActivityDialogOpen}
                onConfirm={handleDeleteActivityConfirm}
                activity={deletingActivity}
                isLoading={isLoading}
            />
        </SidebarProvider>
    );
}