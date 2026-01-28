// components/interview-mgmt/template-detail/SectionDialog.tsx
"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";
import { Section, SectionCreate } from "@/app/lib/api/Interviewtemplateapi";

interface SectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: SectionCreate) => void;
    section?: Section;
    isLoading?: boolean;
}

export default function SectionDialog({
    open,
    onOpenChange,
    onSubmit,
    section,
    isLoading,
}: SectionDialogProps) {
    const [formData, setFormData] = useState<SectionCreate>({
        title: "",
        description: "",
        sortOrder: 0,
        isActive: true,
    });

    useEffect(() => {
        if (section) {
            setFormData({
                title: section.title,
                description: section.description || "",
                sortOrder: section.sortOrder,
                isActive: section.isActive,
            });
        } else {
            setFormData({
                title: "",
                description: "",
                sortOrder: 0,
                isActive: true,
            });
        }
    }, [section, open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {section ? "Edit Section" : "Create New Section"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Section Title *</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) =>
                                setFormData({ ...formData, title: e.target.value })
                            }
                            placeholder="e.g., Background"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description || ""}
                            onChange={(e) =>
                                setFormData({ ...formData, description: e.target.value })
                            }
                            placeholder="Section description..."
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="sortOrder">Sort Order</Label>
                        <Input
                            id="sortOrder"
                            type="number"
                            min="0"
                            value={formData.sortOrder || 0}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    sortOrder: parseInt(e.target.value) || 0,
                                })
                            }
                        />
                    </div>

                    <div className="flex items-center justify-between space-y-0 rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="isActive">Active Status</Label>
                            <p className="text-xs text-muted-foreground">
                                Make this section available
                            </p>
                        </div>
                        <Switch
                            id="isActive"
                            checked={formData.isActive}
                            onCheckedChange={(checked) =>
                                setFormData({ ...formData, isActive: checked })
                            }
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            <Save className="h-4 w-4 mr-2" />
                            {section ? "Save Changes" : "Create Section"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}