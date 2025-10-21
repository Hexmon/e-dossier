"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import { Plus, Settings } from "lucide-react";
import { subjects as initialSubjects, ocTabs, semesterTabs, type Subject } from "@/config/app.config";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { SidebarProvider } from "@/components/ui/sidebar";
import SubjectCard from "@/components/subjects/SubjectCard";
import AddSubjectDialog from "@/components/subjects/AddSubjectDialog";

export default function SubjectManagementPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

    const handleLogout = () => {
        console.log("Logout clicked");
        router.push("/login");
    };

    const handleAddSubject = (newSubject: Omit<Subject, "id">) => {
        if (editingSubject) {
            setSubjects((prev) =>
                prev.map((subject) =>
                    subject.id === editingSubject.id ? { ...subject, ...newSubject } : subject
                )
            );
            setEditingSubject(null);
        } else {
            const id = Date.now().toString();
            setSubjects((prev) => [...prev, { ...newSubject, id }]);
        }
    };

    const handleEditSubject = (id: string) => {
        const subject = subjects.find((s) => s.id === id);
        if (subject) {
            setEditingSubject(subject);
            setIsAddDialogOpen(true);
        }
    };

    const handleDeleteSubject = (id: string) => {
        setSubjects((prev) => prev.filter((subject) => subject.id !== id));
    };

    const filteredSubjects = subjects.filter((subject) =>
        (subject.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (subject.code?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    );


    const getSemesterSubjects = (semester: string) =>
        filteredSubjects.filter((subject) => subject.semNo === semester);

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                {/* Sidebar */}
                <AppSidebar />

                {/* Main Content */}
                <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
                        <PageHeader
                            title="Subject Management"
                            description="Manage subjects, instructors, and curriculum coverage"
                            onLogout={handleLogout}
                        />
                    </header>

                    {/* Main Section */}
                    <main className="flex-1 p-6">
                        {/* Breadcrumb */}
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Gen Mgmt", href: "/dashboard/genmgmt" },
                                { label: "Subject Management" },
                            ]}
                        />

                        {/* Tabs */}
                        <GlobalTabs tabs={ocTabs} defaultValue="subject-mgmt">
                            {/* Subject Management Tab */}
                            <TabsContent value="subject-mgmt" className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-foreground">Subject List</h2>

                                    <Button
                                        variant="outline"
                                        onClick={() => setIsAddDialogOpen(true)}
                                        className="flex items-center gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Subject
                                    </Button>
                                </div>

                                {/* Nested Tabs by Semester */}
                                <GlobalTabs tabs={semesterTabs} defaultValue="semester-i">
                                    {semesterTabs.map((semester) => (
                                        <TabsContent key={semester.value} value={semester.value} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {getSemesterSubjects(semester.title.split(" ")[1]).map((subject) => (
                                                    <SubjectCard
                                                        key={subject.id}
                                                        id={subject.id}
                                                        name={subject.name}
                                                        code={subject.code}
                                                        credits={subject.credits}
                                                        subjectType={subject.subjectType}
                                                        theoryPractical={subject.theoryPractical}
                                                        onEdit={handleEditSubject}
                                                        onDelete={handleDeleteSubject}
                                                    />
                                                ))}
                                            </div>
                                        </TabsContent>
                                    ))}
                                </GlobalTabs>
                            </TabsContent>

                            {/* Settings Tab */}
                            <TabsContent value="settings" className="space-y-6">
                                <div className="text-center py-12">
                                    <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-xl font-semibold text-foreground mb-2">Subject Settings</h3>
                                    <p className="text-muted-foreground">
                                        Configure curriculum or semester settings here.
                                    </p>
                                </div>
                            </TabsContent>
                        </GlobalTabs>
                    </main>
                </div>
            </div>

            {/* Add/Edit Subject Dialog */}
            <AddSubjectDialog
                isOpen={isAddDialogOpen}
                onOpenChange={(open) => {
                    setIsAddDialogOpen(open);
                    if (!open) setEditingSubject(null);
                }}
                onAdd={handleAddSubject}
                subject={editingSubject ?? undefined}
            />
        </SidebarProvider>
    );
}
