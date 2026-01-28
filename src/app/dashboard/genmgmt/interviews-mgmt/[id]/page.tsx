// app/dashboard/genmgmt/interviews-mgmt/[id]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useInterviewTemplates } from "@/hooks/Useinterviewtemplates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TemplateOverview from "@/components/interview-mgmt/template-detail/TemplateOverview";
import TemplateSemesters from "@/components/interview-mgmt/template-detail/TemplateSemesters";
import TemplateSections from "@/components/interview-mgmt/template-detail/TemplateSections";
import TemplateGroups from "@/components/interview-mgmt/template-detail/TemplateGroups";

export default function TemplateDetailPage() {
    const params = useParams();
    const router = useRouter();
    const templateId = params.id as string;

    const { loading, currentTemplate, fetchTemplateById } = useInterviewTemplates();
    const [activeTab, setActiveTab] = useState("overview");

    // Memoize the fetch function to avoid dependency warnings
    const loadTemplate = useCallback(() => {
        if (templateId) {
            fetchTemplateById(templateId);
        }
    }, [templateId, fetchTemplateById]);

    useEffect(() => {
        loadTemplate();
    }, [loadTemplate]);

    const handleLogout = () => {
        console.log("Logout clicked");
        router.push("/login");
    };

    const handleBack = () => {
        router.push("/dashboard/genmgmt/interviews-mgmt");
    };

    if (loading && !currentTemplate) {
        return (
            <SidebarProvider>
                <div className="min-h-screen flex w-full bg-background">
                    <AppSidebar />
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Loading template...</p>
                        </div>
                    </div>
                </div>
            </SidebarProvider>
        );
    }

    if (!currentTemplate) {
        return (
            <SidebarProvider>
                <div className="min-h-screen flex w-full bg-background">
                    <AppSidebar />
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-xl text-muted-foreground mb-4">Template not found</p>
                            <Button onClick={handleBack}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Templates
                            </Button>
                        </div>
                    </div>
                </div>
            </SidebarProvider>
        );
    }

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />

                <div className="flex-1 flex flex-col">
                    <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
                        <PageHeader
                            title={currentTemplate.title}
                            description={`Template Code: ${currentTemplate.code}`}
                            onLogout={handleLogout}
                        />
                    </header>

                    <main className="flex-1 p-6">
                        <div className="mb-4">
                            <Button
                                variant="ghost"
                                onClick={handleBack}
                                className="mb-4"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Templates
                            </Button>

                            <BreadcrumbNav
                                paths={[
                                    { label: "Dashboard", href: "/dashboard" },
                                    { label: "Gentlemen Management", href: "/dashboard/genmgmt" },
                                    { label: "Interview Management", href: "/dashboard/genmgmt/interviews-mgmt" },
                                    { label: currentTemplate.code },
                                ]}
                            />
                        </div>

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                            <TabsList>
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="semesters">Semesters</TabsTrigger>
                                <TabsTrigger value="sections">Sections</TabsTrigger>
                                <TabsTrigger value="groups">Groups</TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview">
                                <TemplateOverview template={currentTemplate} />
                            </TabsContent>

                            <TabsContent value="semesters">
                                <TemplateSemesters templateId={templateId} />
                            </TabsContent>

                            <TabsContent value="sections">
                                <TemplateSections templateId={templateId} />
                            </TabsContent>

                            <TabsContent value="groups">
                                <TemplateGroups templateId={templateId} />
                            </TabsContent>
                        </Tabs>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}