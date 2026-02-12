"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Plus, Settings } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { SidebarProvider } from "@/components/ui/sidebar";
import SubjectCard from "@/components/subjects/SubjectCard";
import SubjectDialog from "@/components/subjects/SubjectDialog";
import { useSubjects } from "@/hooks/useSubjects";
import { useCourses } from "@/hooks/useCourses";
import { useOfferings } from "@/hooks/useOfferings";
import { Subject, SubjectCreate } from "@/app/lib/api/subjectsApi";
import { Input } from "@/components/ui/input";
import { ocTabs } from "@/config/app.config";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function SubjectManagementPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | undefined>(undefined);
    const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
    const [selectedBranch, setSelectedBranch] = useState<string>("all");

    const {
        loading: subjectsLoading,
        subjects,
        addSubject,
        editSubject,
        removeSubject,
    } = useSubjects({ q: searchQuery || undefined });

    const { courses, loading: coursesLoading } = useCourses();
    const {
        offerings,
        loading: offeringsLoading,
    } = useOfferings(selectedCourseId === "all" ? "" : selectedCourseId);

    const branchOptions = useMemo(() => {
        const set = new Set<string>();
        subjects.forEach((subject) => {
            if (subject.branch) set.add(subject.branch);
        });
        return Array.from(set).sort();
    }, [subjects]);

    const courseSubjectIds = useMemo(() => {
        if (selectedCourseId === "all") return null;
        const set = new Set<string>();
        offerings.forEach((offering) => {
            if (offering.subjectId) set.add(offering.subjectId);
        });
        return set;
    }, [offerings, selectedCourseId]);

    const filteredSubjects = useMemo(() => {
        let data = subjects;
        if (selectedBranch !== "all") {
            data = data.filter((subject) => subject.branch === selectedBranch);
        }
        if (selectedCourseId !== "all") {
            if (!courseSubjectIds) return [];
            data = data.filter((subject) => subject.id && courseSubjectIds.has(subject.id));
        }
        return data;
    }, [subjects, selectedBranch, selectedCourseId, courseSubjectIds]);

    const loading = subjectsLoading || (selectedCourseId !== "all" && offeringsLoading) || coursesLoading;

    const handleLogout = () => {
        console.log("Logout clicked");
        router.push("/login");
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    const handleAddSubject = async (newSubject: SubjectCreate) => {
        const editingId = editingSubject?.id;

        if (editingId) {
            const result = await editSubject(editingId, newSubject);
            if (result) {
                setIsDialogOpen(false);
                setEditingSubject(undefined);
            }
        } else {
            const result = await addSubject(newSubject);
            if (result) {
                setIsDialogOpen(false);
            }
        }
    };

    const handleEditSubject = (subject: Subject) => {
        setEditingSubject(subject);
        setIsDialogOpen(true);
    };

    const handleDeleteSubject = async (id: string) => {
        toast("Delete Subject", {
            description: "Are you sure you want to delete this subject?",
            action: {
                label: "Delete",
                onClick: async () => {
                    await removeSubject(id);
                },
            },
            cancel: {
                label: "Cancel",
                onClick: () => { },
            },
        });
    };

    const renderSubjectCards = () => {
        return filteredSubjects.map((subject) => {
            const { id = "" } = subject;
            return (
                <SubjectCard
                    key={id}
                    subject={subject}
                    onEdit={handleEditSubject}
                    onDelete={handleDeleteSubject}
                />
            );
        });
    };

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />

                <div className="flex-1 flex flex-col">
                    <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
                        <PageHeader
                            title="Subject Management"
                            description="Manage subjects, instructors, and curriculum coverage"
                            onLogout={handleLogout}
                        />
                    </header>

                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Admin Mgmt", href: "/dashboard/genmgmt" },
                                { label: "Subject Management" },
                            ]}
                        />

                        <GlobalTabs tabs={ocTabs} defaultValue="subject-mgmt">
                            <TabsContent value="subject-mgmt" className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-foreground">Subject List</h2>

                                    <div className="flex items-center gap-4">
                                        <Input
                                            placeholder="Search subjects..."
                                            value={searchQuery}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            className="w-64"
                                        />
                                        <Select
                                            value={selectedCourseId}
                                            onValueChange={setSelectedCourseId}
                                        >
                                            <SelectTrigger className="w-44">
                                                <SelectValue placeholder="All Courses" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Courses</SelectItem>
                                                {courses.map((course) => (
                                                    <SelectItem key={course.id} value={course.id}>
                                                        {course.courseNo ?? course.id}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={selectedBranch}
                                            onValueChange={setSelectedBranch}
                                        >
                                            <SelectTrigger className="w-40">
                                                <SelectValue placeholder="All Branches" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Branches</SelectItem>
                                                {branchOptions.map((branch) => (
                                                    <SelectItem key={branch} value={branch}>
                                                        {branch}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setEditingSubject(undefined);
                                                setIsDialogOpen(true);
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add Subject
                                        </Button>
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="text-center py-12">Loading...</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {renderSubjectCards()}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="settings" className="space-y-6">
                                <div className="text-center py-12">
                                    <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-xl font-semibold text-foreground mb-2">
                                        Subject Settings
                                    </h3>
                                    <p className="text-muted-foreground">
                                        Configure curriculum or semester settings here.
                                    </p>
                                </div>
                            </TabsContent>
                        </GlobalTabs>
                    </main>
                </div>
            </div>

            <SubjectDialog
                isOpen={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setEditingSubject(undefined);
                }}
                onSubmit={handleAddSubject}
                subject={editingSubject}
                isLoading={loading}
            />
        </SidebarProvider>
    );
}
