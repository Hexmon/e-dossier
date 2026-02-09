"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Plus, Settings } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { SidebarProvider } from "@/components/ui/sidebar";
import PunishmentsTable from "@/components/punishments/PunishmentsTable";
import PunishmentDialog from "@/components/punishments/PunishmentDialog";
import { usePunishments } from "@/hooks/usePunishments";
import { Punishment, PunishmentCreate } from "@/app/lib/api/punishmentsApi";
import { Input } from "@/components/ui/input";
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

export default function PunishmentManagementPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPunishment, setEditingPunishment] = useState<Punishment | undefined>(undefined);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [punishmentToDelete, setPunishmentToDelete] = useState<string | null>(null);

    const {
        loading,
        punishments,
        addPunishment,
        editPunishment,
        removePunishment,
    } = usePunishments({ q: searchQuery });

    const handleLogout = () => {
        console.log("Logout clicked");
        router.push("/login");
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    const handleAddPunishment = async (newPunishment: PunishmentCreate) => {
        const editingId = editingPunishment?.id;

        if (editingId) {
            const result = await editPunishment(editingId, newPunishment);
            if (result) {
                setIsDialogOpen(false);
                setEditingPunishment(undefined);
            }
        } else {
            const result = await addPunishment(newPunishment);
            if (result) {
                setIsDialogOpen(false);
            }
        }
    };

    const handleEditPunishment = (index: number) => {
        const punishment = punishments[index];
        if (punishment) {
            setEditingPunishment(punishment);
            setIsDialogOpen(true);
        }
    };

    const handleDeletePunishment = (id: string) => {
        setPunishmentToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (punishmentToDelete) {
            await removePunishment(punishmentToDelete, true);
        }
        setDeleteConfirmOpen(false);
        setPunishmentToDelete(null);
    };

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />

                <div className="flex-1 flex flex-col">
                    <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
                        <PageHeader
                            title="Punishment Management"
                            description="Manage punishment types and marks deductions"
                            onLogout={handleLogout}
                        />
                    </header>

                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Gen Mgmt", href: "/dashboard/genmgmt" },
                                { label: "Punishment Management" },
                            ]}
                        />

                        <GlobalTabs tabs={ocTabs} defaultValue="punishment-mgmt">
                            <TabsContent value="punishment-mgmt" className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-foreground">Punishment List</h2>

                                    <div className="flex items-center gap-4">
                                        <Input
                                            placeholder="Search punishments..."
                                            value={searchQuery}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            className="w-64"
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setEditingPunishment(undefined);
                                                setIsDialogOpen(true);
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add Punishment
                                        </Button>
                                    </div>
                                </div>

                                <PunishmentsTable
                                    punishmentList={punishments}
                                    onEdit={handleEditPunishment}
                                    onDelete={handleDeletePunishment}
                                    loading={loading}
                                />
                            </TabsContent>

                            <TabsContent value="settings" className="space-y-6">
                                <div className="text-center py-12">
                                    <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-xl font-semibold text-foreground mb-2">
                                        Punishment Settings
                                    </h3>
                                    <p className="text-muted-foreground">
                                        Configure punishment policies and guidelines here.
                                    </p>
                                </div>
                            </TabsContent>
                        </GlobalTabs>
                    </main>
                </div>
            </div>

            <PunishmentDialog
                isOpen={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setEditingPunishment(undefined);
                }}
                onSubmit={handleAddPunishment}
                punishment={editingPunishment}
                isLoading={loading}
            />

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the punishment
                            from the system.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPunishmentToDelete(null)}>
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