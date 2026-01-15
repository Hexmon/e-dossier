"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import { toast } from "sonner";

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

    useEffect(() => {
        fetchPlatoons();
    }, [fetchPlatoons]);

    const handleLogout = () => router.push("/login");

    const handleAddOrEdit = async (data: PlatoonFormData) => {
        try {
            if (editingPlatoon) {
                const { key } = editingPlatoon;
                await editPlatoon(key, {
                    name: data.name,
                    about: data.about,
                });
                // Refetch data after successful edit
                await fetchPlatoons();
            } else {
                await addPlatoon({
                    key: data.key,
                    name: data.name,
                    about: data.about,
                });
                // Refetch data after successful add
                await fetchPlatoons();
            }

            setIsFormOpen(false);
            setEditingPlatoon(undefined);
        } catch (error) {
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
                        console.error("Error deleting platoon:", error);
                        toast.error("Failed to delete platoon");
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
                                { label: "Gen Mgmt", href: "/dashboard/genmgmt" },
                                { label: "Platoon Management" },
                            ]}
                        />

                        <GlobalTabs tabs={ocTabs} defaultValue="platoon-mgmt">
                            <TabsContent value="platoon-mgmt" className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold">Platoon List</h2>

                                    <Button
                                        variant="outline"
                                        className="flex gap-2"
                                        onClick={handleOpenAddDialog}
                                        disabled={isLoading}
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Platoon
                                    </Button>
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
            />
        </SidebarProvider>
    );
}