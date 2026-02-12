"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Plus, Settings } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { SidebarProvider } from "@/components/ui/sidebar";
import OfferingsTable from "@/components/offerings/OfferingsTable";
import OfferingDialog from "@/components/offerings/OfferingDialog";
import { useOfferings } from "@/hooks/useOfferings";
import { useSubjects } from "@/hooks/useSubjects";
import { useInstructors } from "@/hooks/useInstructors";
import { Offering, OfferingCreate } from "@/app/lib/api/offeringsApi";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { academicsTabs } from "@/config/app.config";
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

export default function OfferingManagementPage() {
    const router = useRouter();
    const params = useParams();
    const courseId = params.courseId as string;

    const [selectedSemester, setSelectedSemester] = useState<number | undefined>(undefined);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingOffering, setEditingOffering] = useState<Offering | undefined>(undefined);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [offeringToDelete, setOfferingToDelete] = useState<string | null>(null);

    // Use React Query hooks - they handle their own fetching and caching
    const {
        loading: offeringsLoading,
        offerings,
        addOffering,
        editOffering,
        removeOffering,
        isCreating,
        isUpdating,
        isDeleting,
    } = useOfferings(courseId, { semester: selectedSemester });

    const {
        loading: subjectsLoading,
        subjects,
    } = useSubjects();

    const {
        loading: instructorsLoading,
        instructors,
    } = useInstructors();

    const handleLogout = () => {
        console.log("Logout clicked");
        router.push("/login");
    };

    const handleSemesterChange = (value: string) => {
        const semester = value === "all" ? undefined : parseInt(value);
        setSelectedSemester(semester);
        // React Query will automatically refetch when the semester param changes
    };

    const handleAddOffering = async (newOffering: OfferingCreate) => {
        const editingId = editingOffering?.id;

        try {
            if (editingId) {
                await editOffering(editingId, newOffering);
            } else {
                await addOffering(newOffering);
            }
            setIsDialogOpen(false);
            setEditingOffering(undefined);
        } catch (error) {
            // Error handling is done in the hook
            console.error("Error saving offering:", error);
        }
    };

    const handleEditOffering = (index: number) => {
        const offering = offerings[index];
        if (offering) {
            setEditingOffering(offering);
            setIsDialogOpen(true);
        }
    };

    const handleDeleteOffering = (id: string) => {
        setOfferingToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (offeringToDelete) {
            try {
                await removeOffering(offeringToDelete);
            } catch (error) {
                console.error("Error deleting offering:", error);
            }
        }
        setDeleteConfirmOpen(false);
        setOfferingToDelete(null);
    };

    // Transform subjects for the form
    const subjectsForForm = subjects.map((subject) => {
        const { id = "", code = "", name = "" } = subject;
        return {
            id,
            code,
            name,
        };
    });

    // Transform instructors for the form
    const instructorsForForm = instructors.map((instructor) => {
        const { id = "", name = "", email = "" } = instructor;
        return {
            id,
            name,
            email,
        };
    });

    const loading = offeringsLoading || subjectsLoading || instructorsLoading;
    const isMutating = isCreating || isUpdating || isDeleting;

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />

                <div className="flex-1 flex flex-col">
                    <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
                        <PageHeader
                            title="Offering Management"
                            description="Manage course offerings and assignments"
                            onLogout={handleLogout}
                        />
                    </header>

                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Admin Mgmt", href: "/dashboard/genmgmt" },
                                { label: "Offerings" },
                            ]}
                        />

                        <GlobalTabs tabs={academicsTabs} defaultValue="offerings">
                            <TabsContent value="offerings" className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-foreground">Offering List</h2>

                                    <div className="flex items-center gap-4">
                                        <Select
                                            value={selectedSemester === undefined ? "all" : String(selectedSemester)}
                                            onValueChange={handleSemesterChange}
                                        >
                                            <SelectTrigger className="w-40">
                                                <SelectValue placeholder="All Semesters" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Semesters</SelectItem>
                                                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                                                    <SelectItem key={sem} value={String(sem)}>
                                                        Semester {sem}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setEditingOffering(undefined);
                                                setIsDialogOpen(true);
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add Offering
                                        </Button>
                                    </div>
                                </div>

                                <OfferingsTable
                                    offeringList={offerings}
                                    onEdit={handleEditOffering}
                                    onDelete={handleDeleteOffering}
                                    loading={offeringsLoading}
                                />
                            </TabsContent>

                            <TabsContent value="settings" className="space-y-6">
                                <div className="text-center py-12">
                                    <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-xl font-semibold text-foreground mb-2">
                                        Offering Settings
                                    </h3>
                                    <p className="text-muted-foreground">
                                        Configure offering schedules and policies here.
                                    </p>
                                </div>
                            </TabsContent>
                        </GlobalTabs>
                    </main>
                </div>
            </div>

            <OfferingDialog
                isOpen={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setEditingOffering(undefined);
                }}
                onSubmit={handleAddOffering}
                offering={editingOffering}
                isLoading={isMutating}
                subjects={subjectsForForm}
                instructors={instructorsForForm}
                defaultSemester={selectedSemester !== undefined ? selectedSemester : undefined}
            />

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the offering
                            from the system.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setOfferingToDelete(null)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </SidebarProvider>
    );
}
