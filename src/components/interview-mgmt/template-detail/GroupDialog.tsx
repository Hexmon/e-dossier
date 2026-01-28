// components/interview-mgmt/template-detail/GroupDialog.tsx
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
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Save } from "lucide-react";
import { Group, GroupCreate, Section } from "@/app/lib/api/Interviewtemplateapi";

interface GroupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: GroupCreate) => void;
    group?: Group;
    sections: Section[];
    isLoading?: boolean;
}

export default function GroupDialog({
    open,
    onOpenChange,
    onSubmit,
    group,
    sections,
    isLoading,
}: GroupDialogProps) {
    const [formData, setFormData] = useState<GroupCreate>({
        sectionId: "",
        title: "",
        minRows: 0,
        maxRows: 10,
        sortOrder: 0,
        isActive: true,
    });

    useEffect(() => {
        if (group) {
            setFormData({
                sectionId: group.sectionId,
                title: group.title,
                minRows: group.minRows,
                maxRows: group.maxRows,
                sortOrder: group.sortOrder,
                isActive: group.isActive,
            });
        } else {
            setFormData({
                sectionId: sections.length > 0 ? sections[0].id : "",
                title: "",
                minRows: 0,
                maxRows: 10,
                sortOrder: 0,
                isActive: true,
            });
        }
    }, [group, sections, open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {group ? "Edit Group" : "Create New Group"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="sectionId">Parent Section *</Label>
                        <Select
                            value={formData.sectionId}
                            onValueChange={(value) =>
                                setFormData({ ...formData, sectionId: value })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select section" />
                            </SelectTrigger>
                            <SelectContent>
                                {sections.map((section) => (
                                    <SelectItem key={section.id} value={section.id}>
                                        {section.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Select which section this group belongs to
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Group Title *</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) =>
                                setFormData({ ...formData, title: e.target.value })
                            }
                            placeholder="e.g., Interview Sheet: Special"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="minRows">Minimum Rows</Label>
                            <Input
                                id="minRows"
                                type="number"
                                min="0"
                                value={formData.minRows || 0}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        minRows: parseInt(e.target.value) || 0,
                                    })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maxRows">Maximum Rows</Label>
                            <Input
                                id="maxRows"
                                type="number"
                                min="1"
                                value={formData.maxRows || 10}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        maxRows: parseInt(e.target.value) || 10,
                                    })
                                }
                            />
                        </div>
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
                                Make this group available
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
                            {group ? "Save Changes" : "Create Group"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}