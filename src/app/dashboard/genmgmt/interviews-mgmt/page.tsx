// app/dashboard/genmgmt/interviews-mgmt/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Plus, Settings, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { SidebarProvider } from "@/components/ui/sidebar";
import InterviewTemplatesTable from "@/components/interview-mgmt/Interviewtemplatestable";
import InterviewTemplateDialog from "@/components/interview-mgmt/Interviewtemplatedialog";
import { useInterviewTemplates } from "@/hooks/Useinterviewtemplates";
import { InterviewTemplate, InterviewTemplateCreate } from "@/app/lib/api/Interviewtemplateapi";
import { Input } from "@/components/ui/input";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ocTabs } from "@/config/app.config";

export default function InterviewTemplateManagementPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [semesterFilter, setSemesterFilter] = useState<string>("all");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<InterviewTemplate | undefined>(undefined);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

    const {
        loading,
        templates,
        fetchTemplates,
        addTemplate,
        editTemplate,
        removeTemplate,
    } = useInterviewTemplates();

    useEffect(() => {
        const params: Record<string, string | number | boolean> = {};
        if (semesterFilter !== "all") {
            params.semester = parseInt(semesterFilter);
        }
        fetchTemplates(params);
    }, [semesterFilter, fetchTemplates]);

    const handleLogout = () => {
        console.log("Logout clicked");
        router.push("/login");
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    const handleAddTemplate = async (newTemplate: InterviewTemplateCreate) => {
        const editingId = editingTemplate?.id;

        if (editingId) {
            const result = await editTemplate(editingId, newTemplate);
            if (result) {
                await fetchTemplates();
                setIsDialogOpen(false);
                setEditingTemplate(undefined);
            }
        } else {
            const result = await addTemplate(newTemplate);
            if (result) {
                await fetchTemplates();
                setIsDialogOpen(false);
            }
        }
    };

    const handleViewTemplate = (index: number) => {
        const template = filteredTemplates[index];
        if (template) {
            // Navigate to detail page
            router.push(`/dashboard/genmgmt/interviews-mgmt/${template.id}`);
        }
    };

    const handleEditTemplate = (index: number) => {
        const template = filteredTemplates[index];
        if (template) {
            setEditingTemplate(template);
            setIsDialogOpen(true);
        }
    };

    const handleDeleteTemplate = (id: string) => {
        setTemplateToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (templateToDelete) {
            const result = await removeTemplate(templateToDelete, false);
            if (result) {
                await fetchTemplates();
            }
        }
        setDeleteConfirmOpen(false);
        setTemplateToDelete(null);
    };

    // Client-side search filtering
    const filteredTemplates = templates.filter((template) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            (template.code || "").toLowerCase().includes(query) ||
            (template.title || "").toLowerCase().includes(query) ||
            (template.description || "").toLowerCase().includes(query)
        );
    });

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />

                <div className="flex-1 flex flex-col">
                    <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
                        <PageHeader
                            title="Interview Template Management"
                            description="Manage interview templates, sections, and fields"
                            onLogout={handleLogout}
                        />
                    </header>

                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Gentlemen Management", href: "/dashboard/genmgmt" },
                                { label: "Interview Management", href: "/dashboard/genmgmt/interviews-mgmt" },
                                { label: "Templates" },
                            ]}
                        />

                        <GlobalTabs tabs={ocTabs} defaultValue="templates">
                            <TabsContent value="templates" className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-6 w-6 text-primary" />
                                        <h2 className="text-2xl font-bold text-foreground">
                                            Interview Templates
                                        </h2>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <Select
                                            value={semesterFilter}
                                            onValueChange={setSemesterFilter}
                                        >
                                            <SelectTrigger className="w-40">
                                                <SelectValue placeholder="Filter by semester" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Semesters</SelectItem>
                                                <SelectItem value="1">Semester 1</SelectItem>
                                                <SelectItem value="2">Semester 2</SelectItem>
                                                <SelectItem value="3">Semester 3</SelectItem>
                                                <SelectItem value="4">Semester 4</SelectItem>
                                                <SelectItem value="5">Semester 5</SelectItem>
                                                <SelectItem value="6">Semester 6</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Input
                                            placeholder="Search templates..."
                                            value={searchQuery}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            className="w-64"
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setEditingTemplate(undefined);
                                                setIsDialogOpen(true);
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Create Template
                                        </Button>
                                    </div>
                                </div>

                                <InterviewTemplatesTable
                                    templates={filteredTemplates}
                                    onView={handleViewTemplate}
                                    onEdit={handleEditTemplate}
                                    onDelete={handleDeleteTemplate}
                                    loading={loading}
                                />
                            </TabsContent>

                            <TabsContent value="settings" className="space-y-6">
                                <div className="text-center py-12">
                                    <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-xl font-semibold text-foreground mb-2">
                                        Interview Settings
                                    </h3>
                                    <p className="text-muted-foreground">
                                        Configure interview policies and guidelines here.
                                    </p>
                                </div>
                            </TabsContent>
                        </GlobalTabs>
                    </main>
                </div>
            </div>

            <InterviewTemplateDialog
                isOpen={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setEditingTemplate(undefined);
                }}
                onSubmit={handleAddTemplate}
                template={editingTemplate}
                isLoading={loading}
            />

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will soft delete the template. The template can be restored later.
                            To permanently delete, use hard delete option.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setTemplateToDelete(null)}>
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