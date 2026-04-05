"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { ocTabs } from "@/config/app.config";
import PlatoonDialog from "@/components/platoon/PlatoonDialog";
import PlatoonViewDialog from "@/components/platoon/PlatoonViewDialog";
import PlatoonsTable from "@/components/platoon/PlatoonsTable";
import { Platoon, PlatoonFormData } from "@/types/platoon";
import { usePlatoons } from "@/hooks/usePlatoons";
import { getPlatoonCommanderHistory, type PlatoonCommanderHistoryItem } from "@/app/lib/api/platoonApi";
import { toast } from "sonner";
import { getToastMsg } from "@/lib/error-toast";
import { logoutAndRedirect } from "@/lib/auth/logout";
import { applyOrgTemplate } from "@/app/lib/api/orgTemplateApi";
import { SetupReturnBanner } from "@/components/setup/SetupReturnBanner";

export default function PlatoonManagementPage() {
    const router = useRouter();
    const {
        platoons,
        isLoading,
        fetchPlatoons,
        addPlatoon,
        editPlatoon,
        removePlatoon,
    } = usePlatoons();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPlatoon, setEditingPlatoon] = useState<Platoon | undefined>();
    const [viewPlatoon, setViewPlatoon] = useState<Platoon | undefined>();
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [commanderHistory, setCommanderHistory] = useState<PlatoonCommanderHistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const applyDefaultTemplateMutation = useMutation({
        mutationFn: (dryRun: boolean) =>
            applyOrgTemplate({ module: "platoon", profile: "default", dryRun }),
        onSuccess: async (result, dryRun) => {
            await fetchPlatoons();
            const prefix = dryRun ? "Dry run complete." : "Default platoon template applied.";
            toast.success(
                `${prefix} Created: ${result.createdCount}, Updated: ${result.updatedCount}, Skipped: ${result.skippedCount}`
            );
            if (result.warnings.length > 0) {
                toast.warning(`Completed with ${result.warnings.length} warning(s).`);
            }
        },
        onError: (error: any) => {
            toast.error(error?.message || "Failed to apply default platoon template.");
        },
    });

    useEffect(() => {
        fetchPlatoons();
    }, [fetchPlatoons]);

    const handleLogout = () => {
      void logoutAndRedirect({
        reason: "manual",
        preserveNext: false,
        router,
      });
    };

    const handleAddOrEdit = async (data: PlatoonFormData) => {
        try {
            if (editingPlatoon) {
                const { key } = editingPlatoon;
                await editPlatoon(key, {
                    name: data.name,
                    about: data.about,
                    themeColor: data.themeColor,
                    imageUrl: data.imageUrl,
                    imageObjectKey: data.imageObjectKey,
                });
                toast.success("Platoon updated successfully");
                // Refetch data after successful edit
                await fetchPlatoons();
            } else {
                await addPlatoon({
                    key: data.key,
                    name: data.name,
                    about: data.about,
                    themeColor: data.themeColor,
                    imageUrl: data.imageUrl,
                    imageObjectKey: data.imageObjectKey,
                });
                toast.success("Platoon created successfully");
                // Refetch data after successful add
                await fetchPlatoons();
            }

            setIsFormOpen(false);
            setEditingPlatoon(undefined);
        } catch (error) {
            console.debug("Platoon save error:", error);
            toast.error(getToastMsg(error));
        }
    };

    const handleDelete = (id: string) => {
        toast("Delete platoon?", {
            description: "This action cannot be undone.",
            action: {
                label: "Delete",
                onClick: async () => {
                    try {
                        await removePlatoon(id);
                        await fetchPlatoons();
                        toast.success("Platoon deleted successfully");
                    } catch (error) {
                        console.debug("Error deleting platoon:", error);
                        toast.error(getToastMsg(error));
                    }
                },
            },
        });
    };

    const handleOpenAddDialog = () => {
        setEditingPlatoon(undefined);
        setIsFormOpen(true);
    };

    const handleOpenEditDialog = (platoon: Platoon) => {
        setEditingPlatoon(platoon);
        setIsFormOpen(true);
    };

    const handleOpenViewDialog = (platoon: Platoon) => {
        setViewPlatoon(platoon);
        setIsViewOpen(true);
        setCommanderHistory([]);
        setHistoryLoading(true);
        void (async () => {
            try {
                const response = await getPlatoonCommanderHistory(platoon.id);
                setCommanderHistory(response.items ?? []);
            } catch (error) {
                console.debug("Commander history load error:", error);
                setCommanderHistory([]);
                toast.error(getToastMsg(error));
            } finally {
                setHistoryLoading(false);
            }
        })();
    };

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />

                <div className="flex-1 flex flex-col">
                    <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
                        <PageHeader
                            title="Platoon Management"
                            description="Manage platoons and commanders"
                            onLogout={handleLogout}
                        />
                    </header>

                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Admin Mgmt", href: "/dashboard/genmgmt" },
                                { label: "Platoon Management" },
                            ]}
                        />

                        <SetupReturnBanner
                            title="Setup step: Platoons"
                            description="Add the required platoons here, then return to the setup checklist."
                        />

                        <GlobalTabs tabs={ocTabs} defaultValue="platoon-management">
                            <TabsContent value="platoon-management" className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold">Platoon List</h2>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => applyDefaultTemplateMutation.mutate(true)}
                                            disabled={isLoading || applyDefaultTemplateMutation.isPending}
                                        >
                                            {applyDefaultTemplateMutation.isPending ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Running
                                                </>
                                            ) : (
                                                "Preview Changes (Dry Run)"
                                            )}
                                        </Button>

                                        <Button
                                            variant="outline"
                                            onClick={() => applyDefaultTemplateMutation.mutate(false)}
                                            disabled={isLoading || applyDefaultTemplateMutation.isPending}
                                        >
                                            {applyDefaultTemplateMutation.isPending ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Applying
                                                </>
                                            ) : (
                                                "Apply Default Platoon Template"
                                            )}
                                        </Button>

                                        <Button
                                            variant="outline"
                                            className="flex gap-2"
                                            onClick={handleOpenAddDialog}
                                            disabled={isLoading || applyDefaultTemplateMutation.isPending}
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add Platoon
                                        </Button>
                                    </div>
                                </div>

                                <PlatoonsTable
                                    platoons={platoons}
                                    isLoading={isLoading}
                                    onView={handleOpenViewDialog}
                                    onEdit={handleOpenEditDialog}
                                    onDelete={handleDelete}
                                />
                            </TabsContent>
                        </GlobalTabs>
                    </main>
                </div>
            </div>

            {/* ADD / EDIT */}
            <PlatoonDialog
                isOpen={isFormOpen}
                onOpenChange={setIsFormOpen}
                platoon={editingPlatoon}
                onSubmit={handleAddOrEdit}
            />

            {/* VIEW */}
            <PlatoonViewDialog
                isOpen={isViewOpen}
                onOpenChange={setIsViewOpen}
                platoon={viewPlatoon}
                commanderHistory={commanderHistory}
                historyLoading={historyLoading}
            />
        </SidebarProvider>
    );
}
