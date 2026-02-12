"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Plus, Settings } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { SidebarProvider } from "@/components/ui/sidebar";
import InstructorsTable from "@/components/instructors/InstructorsTable";
import InstructorDialog from "@/components/instructors/InstructorDialog";
import { useInstructors } from "@/hooks/useInstructors";
import { Instructor, InstructorCreate } from "@/app/lib/api/instructorsApi";
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

export default function InstructorManagementPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingInstructor, setEditingInstructor] = useState<Instructor | undefined>(undefined);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [instructorToDelete, setInstructorToDelete] = useState<string | null>(null);

    const {
        loading,
        instructors,
        addInstructor,
        editInstructor,
        removeInstructor,
    } = useInstructors({ q: searchQuery });

    const handleLogout = () => {
        console.log("Logout clicked");
        router.push("/login");
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    const handleAddInstructor = async (newInstructor: InstructorCreate) => {
        const editingId = editingInstructor?.id;

        if (editingId) {
            const result = await editInstructor(editingId, newInstructor);
            if (result) {
                setIsDialogOpen(false);
                setEditingInstructor(undefined);
            }
        } else {
            const result = await addInstructor(newInstructor);
            if (result) {
                setIsDialogOpen(false);
            }
        }
    };

    const handleEditInstructor = (index: number) => {
        const instructor = instructors[index];
        if (instructor) {
            setEditingInstructor(instructor);
            setIsDialogOpen(true);
        }
    };

    const handleDeleteInstructor = (id: string) => {
        setInstructorToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (instructorToDelete) {
            await removeInstructor(instructorToDelete);
        }
        setDeleteConfirmOpen(false);
        setInstructorToDelete(null);
    };

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />

                <div className="flex-1 flex flex-col">
                    <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
                        <PageHeader
                            title="Instructor Management"
                            description="Manage instructors and their assignments"
                            onLogout={handleLogout}
                        />
                    </header>

                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Admin Mgmt", href: "/dashboard/genmgmt" },
                                { label: "Instructor Management" },
                            ]}
                        />

                        <GlobalTabs tabs={ocTabs} defaultValue="instructors">
                            <TabsContent value="instructors" className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-foreground">Instructor List</h2>

                                    <div className="flex items-center gap-4">
                                        <Input
                                            placeholder="Search instructors..."
                                            value={searchQuery}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            className="w-64"
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setEditingInstructor(undefined);
                                                setIsDialogOpen(true);
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add Instructor
                                        </Button>
                                    </div>
                                </div>

                                <InstructorsTable
                                    instructorList={instructors}
                                    onEdit={handleEditInstructor}
                                    onDelete={handleDeleteInstructor}
                                    loading={loading}
                                />
                            </TabsContent>

                            <TabsContent value="settings" className="space-y-6">
                                <div className="text-center py-12">
                                    <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-xl font-semibold text-foreground mb-2">
                                        Instructor Settings
                                    </h3>
                                    <p className="text-muted-foreground">
                                        Configure instructor assignments and schedules here.
                                    </p>
                                </div>
                            </TabsContent>
                        </GlobalTabs>
                    </main>
                </div>
            </div>

            <InstructorDialog
                isOpen={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setEditingInstructor(undefined);
                }}
                onSubmit={handleAddInstructor}
                instructor={editingInstructor}
                isLoading={loading}
            />

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the instructor
                            from the system.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setInstructorToDelete(null)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </SidebarProvider>
    );
}