// components/interview-mgmt/template-detail/TemplateOverview.tsx
"use client";

import { InterviewTemplate } from "@/app/lib/api/Interviewtemplateapi";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, FileText, Hash, Info } from "lucide-react";
import { format } from "date-fns";

interface TemplateOverviewProps {
    template: InterviewTemplate;
}

export default function TemplateOverview({ template }: TemplateOverviewProps) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Template Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Template Code
                            </label>
                            <p className="text-lg font-mono">{template.code}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Title
                            </label>
                            <p className="text-lg">{template.title}</p>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium text-muted-foreground">
                                Description
                            </label>
                            <p className="text-base">
                                {template.description || "No description provided"}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Sort Order
                            </label>
                            <p className="text-lg">{template.sortOrder}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Status
                            </label>
                            <div className="mt-1">
                                {template.isActive ? (
                                    <Badge className="bg-green-600">Active</Badge>
                                ) : (
                                    <Badge variant="secondary">Inactive</Badge>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Allow Multiple
                            </label>
                            <div className="mt-1">
                                {template.allowMultiple ? (
                                    <Badge>Yes</Badge>
                                ) : (
                                    <Badge variant="secondary">No</Badge>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Created At
                            </label>
                            <p className="text-base">
                                {format(new Date(template.createdAt), "PPP")}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {template.semesters && template.semesters.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Applicable Semesters
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {template.semesters.map((sem) => (
                                <Badge key={sem.id} variant="outline">
                                    Semester {sem.semester}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}