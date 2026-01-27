"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/Switch";
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
            });
        } else {
            setFormData({
                code: "",
                title: "",
                description: "",
                allowMultiple: false,
                sortOrder: 0,
                isActive: true,
            });
        }
    }, [template]);

    const handleChange = (field: keyof InterviewTemplateCreate, value: string | number | boolean) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const { code, title } = formData;
        if (!code || !title) {
            toast.error("Code and Title are required");
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