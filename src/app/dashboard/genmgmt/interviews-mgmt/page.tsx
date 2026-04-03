// app/dashboard/genmgmt/interviews-mgmt/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Plus, Settings, FileText, Copy } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { SidebarProvider } from "@/components/ui/sidebar";
import InterviewTemplatesTable from "@/components/interview-mgmt/Interviewtemplatestable";
import InterviewTemplateDialog from "@/components/interview-mgmt/Interviewtemplatedialog";
import { useInterviewTemplates } from "@/hooks/useInterviewTemplates";
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
import { moduleManagementTabs, ocTabs } from "@/config/app.config";
import { logoutAndRedirect } from "@/lib/auth/logout";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { getAllCourses, type CourseResponse } from "@/app/lib/api/courseApi";

export default function InterviewTemplateManagementPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [semesterFilter, setSemesterFilter] = useState<string>("all");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<InterviewTemplate | undefined>(undefined);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
    const [copySourceCourseId, setCopySourceCourseId] = useState("");
    const [copyTargetCourseId, setCopyTargetCourseId] = useState("");

    const { data: courseItems = [] } = useQuery({
        queryKey: ["courses", "interview-mgmt"],
        queryFn: async () => {
            const response = await getAllCourses();
            return (response.items ?? []).filter((course) => !course.deleted_at);
        },
        staleTime: 60_000,
    });

    useEffect(() => {
        if (!selectedCourseId && courseItems.length > 0) {
            const firstCourseId = courseItems[0].id;
            setSelectedCourseId(firstCourseId);
            setCopyTargetCourseId(firstCourseId);
        }
    }, [courseItems, selectedCourseId]);

    useEffect(() => {
        if (selectedCourseId) {
            setCopyTargetCourseId(selectedCourseId);
        }
    }, [selectedCourseId]);

    // Build listParams from the semester filter — React Query re-fetches
    // automatically whenever this object changes via the query key.
    const listParams = !selectedCourseId
        ? undefined
        : semesterFilter !== "all"
            ? { courseId: selectedCourseId, semester: parseInt(semesterFilter) }
            : { courseId: selectedCourseId };

    const {
        loading,
        templates,
        addTemplate,
        cloneTemplate,
        editTemplate,
        removeTemplate,
        isCopyingTemplate,
    } = useInterviewTemplates({ listParams });

    // No useEffect needed — useQuery fetches on mount and whenever listParams changes.

    const handleLogout = () => {
      void logoutAndRedirect({
        reason: "manual",
        preserveNext: false,
        router,
      });
    };

    const handleAddTemplate = async (newTemplate: InterviewTemplateCreate) => {
        const editingId = editingTemplate?.id;

        try {
            if (editingId) {
                // mutateAsync throws on error, so the dialog only closes on success
                await editTemplate(editingId, newTemplate);
                setEditingTemplate(undefined);
            } else {
                await addTemplate({ ...newTemplate, courseId: selectedCourseId });
            }
            setIsDialogOpen(false);
        } catch {
            // Toast is already shown by the mutation's onError — nothing else to do.
        }
    };

    const handleViewTemplate = (index: number) => {
        const template = filteredTemplates[index];
        if (template) {
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

    const resetCopyState = () => {
        setCopySourceCourseId("");
        setCopyTargetCourseId(selectedCourseId);
    };

    const handleCopyTemplate = async () => {
        if (!copySourceCourseId || !copyTargetCourseId || copySourceCourseId === copyTargetCourseId) {
            return;
        }

        try {
            const result = await cloneTemplate({
                sourceCourseId: copySourceCourseId,
                targetCourseId: copyTargetCourseId,
                mode: "replace",
            });
            setIsCopyDialogOpen(false);
            resetCopyState();
        } catch {
            // Toast already handled by the mutation.
        }
    };

    const confirmDelete = async () => {
        if (templateToDelete) {
            try {
                await removeTemplate(templateToDelete, false);
            } catch {
                // Toast already shown by mutation onError.
            }
        }
        setDeleteConfirmOpen(false);
        setTemplateToDelete(null);
    };

    // Client-side search filtering (runs against the already-cached list)
    const filteredTemplates = templates.filter((template) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            (template.code ?? "").toLowerCase().includes(query) ||
            (template.title ?? "").toLowerCase().includes(query) ||
            (template.description ?? "").toLowerCase().includes(query)
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
                                { label: "Module Mgmt", href: "/dashboard/genmgmt?tab=module-mgmt" },
                                { label: "Interview Management", href: "/dashboard/genmgmt/interviews-mgmt" },
                            ]}
                        />

                        <GlobalTabs tabs={moduleManagementTabs} defaultValue="interviews-mgmt">
                            <TabsContent value="interviews-mgmt" className="space-y-6">
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
                                            onChange={(e) => setSearchQuery(e.target.value)}
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
                                        <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                                            <SelectTrigger className="w-64">
                                                <SelectValue placeholder="Select course" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {courseItems.map((course: CourseResponse) => (
                                                    <SelectItem key={course.id} value={course.id}>
                                                        {course.code} - {course.title}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsCopyDialogOpen(true)}
                                            className="flex items-center gap-2"
                                        >
                                            <Copy className="h-4 w-4" />
                                            Copy Template
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

            <Dialog
                open={isCopyDialogOpen}
                onOpenChange={(open) => {
                    setIsCopyDialogOpen(open);
                    if (!open) resetCopyState();
                }}
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Copy Interview Template</DialogTitle>
                        <DialogDescription>
                            Replace the selected course interview templates with another course&apos;s interview template set.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="copy-source-course">Source Course</Label>
                            <Select value={copySourceCourseId} onValueChange={setCopySourceCourseId}>
                                <SelectTrigger id="copy-source-course">
                                    <SelectValue placeholder="Select source course" />
                                </SelectTrigger>
                                <SelectContent>
                                    {courseItems.map((course: CourseResponse) => (
                                        <SelectItem key={course.id} value={course.id}>
                                            {course.code} - {course.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="copy-target-course">Target Course</Label>
                            <Select value={copyTargetCourseId} onValueChange={setCopyTargetCourseId}>
                                <SelectTrigger id="copy-target-course">
                                    <SelectValue placeholder="Select target course" />
                                </SelectTrigger>
                                <SelectContent>
                                    {courseItems.map((course: CourseResponse) => (
                                        <SelectItem key={`target-${course.id}`} value={course.id}>
                                            {course.code} - {course.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsCopyDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={() => void handleCopyTemplate()}
                            disabled={
                                loading ||
                                isCopyingTemplate ||
                                !copySourceCourseId ||
                                !copyTargetCourseId ||
                                copySourceCourseId === copyTargetCourseId
                            }
                        >
                            {isCopyingTemplate ? "Copying..." : "Copy Template"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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

