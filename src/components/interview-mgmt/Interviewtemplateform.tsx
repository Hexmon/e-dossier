// components/interview-mgmt/Interviewtemplateform.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { InterviewTemplate, InterviewTemplateCreate } from "@/app/lib/api/Interviewtemplateapi";

interface InterviewTemplateFormProps {
    template?: InterviewTemplate;
    onSubmit: (template: InterviewTemplateCreate) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export default function InterviewTemplateForm({
    template,
    onSubmit,
    onCancel,
    isLoading = false,
}: InterviewTemplateFormProps) {
    const [formData, setFormData] = useState<InterviewTemplateCreate>({
        code: "",
        title: "",
        description: "",
        allowMultiple: false,
        sortOrder: 0,
        isActive: true,
        semesters: [],
    });

    useEffect(() => {
        if (template) {
            setFormData({
                code: template.code || "",
                title: template.title || "",
                description: template.description || "",
                allowMultiple: template.allowMultiple || false,
                sortOrder: template.sortOrder || 0,
                isActive: template.isActive !== undefined ? template.isActive : true,
                semesters: template.semesters?.map(s => s.semester) || [],
            });
        } else {
            setFormData({
                code: "",
                title: "",
                description: "",
                allowMultiple: false,
                sortOrder: 0,
                isActive: true,
                semesters: [],
            });
        }
    }, [template]);

    const handleChange = (field: keyof InterviewTemplateCreate, value: string | number | boolean | number[]) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSemesterToggle = (semester: number, checked: boolean) => {
        setFormData((prev) => {
            const currentSemesters = prev.semesters || [];
            if (checked) {
                return {
                    ...prev,
                    semesters: [...currentSemesters, semester].sort(),
                };
            } else {
                return {
                    ...prev,
                    semesters: currentSemesters.filter((s) => s !== semester),
                };
            }
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const { code, title, semesters } = formData;
        if (!code || !title) {
            toast.error("Code and Title are required");
            return;
        }

        if (!template && (!semesters || semesters.length === 0)) {
            toast.error("Please select at least one semester");
            return;
        }

        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Code */}
            <div className="space-y-2">
                <Label htmlFor="code">Template Code *</Label>
                <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => handleChange("code", e.target.value)}
                    placeholder="e.g., INIT_PL_CDR"
                    required
                />
                <p className="text-xs text-muted-foreground">
                    Unique identifier for the template
                </p>
            </div>

            {/* Title */}
            <div className="space-y-2">
                <Label htmlFor="title">Template Title *</Label>
                <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder="e.g., Initial Interview by PL Cdr"
                    required
                />
            </div>

            {/* Description */}
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={formData.description || ""}
                    onChange={(e) => handleChange("description", e.target.value)}
                    placeholder="Template description..."
                    rows={3}
                />
            </div>

            {/* Semester Selection */}
            {!template && (
                <div className="space-y-2">
                    <Label>Applicable Semesters *</Label>
                    <div className="grid grid-cols-3 gap-3 p-4 border rounded-lg">
                        {[1, 2, 3, 4, 5, 6].map((sem) => (
                            <div key={sem} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`sem-${sem}`}
                                    checked={formData.semesters?.includes(sem) || false}
                                    onCheckedChange={(checked) =>
                                        handleSemesterToggle(sem, checked as boolean)
                                    }
                                />
                                <label
                                    htmlFor={`sem-${sem}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Semester {sem}
                                </label>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Select the semesters where this template will be available
                    </p>
                </div>
            )}

            {/* Sort Order */}
            <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                    id="sortOrder"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.sortOrder || 0}
                    onChange={(e) => handleChange("sortOrder", parseInt(e.target.value) || 0)}
                    placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                    Display order (lower numbers appear first)
                </p>
            </div>

            {/* Allow Multiple */}
            <div className="flex items-center justify-between space-y-0 rounded-lg border p-4">
                <div className="space-y-0.5">
                    <Label htmlFor="allowMultiple">Allow Multiple Instances</Label>
                    <p className="text-xs text-muted-foreground">
                        Allow multiple interviews using this template
                    </p>
                </div>
                <Switch
                    id="allowMultiple"
                    checked={formData.allowMultiple || false}
                    onCheckedChange={(checked) => handleChange("allowMultiple", checked)}
                />
            </div>

            {/* Is Active */}
            <div className="flex items-center justify-between space-y-0 rounded-lg border p-4">
                <div className="space-y-0.5">
                    <Label htmlFor="isActive">Active Status</Label>
                    <p className="text-xs text-muted-foreground">
                        Make this template available for use
                    </p>
                </div>
                <Switch
                    id="isActive"
                    checked={formData.isActive !== undefined ? formData.isActive : true}
                    onCheckedChange={(checked) => handleChange("isActive", checked)}
                />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {template ? "Save Changes" : "Create Template"}
                </Button>
            </div>
        </form>
    );
}