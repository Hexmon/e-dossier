"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { PTTask, PTTaskCreate } from "@/app/lib/api/Physicaltrainingapi";

interface PTTaskFormProps {
    task?: PTTask;
    suggestedSortOrder?: number;
    onSubmit: (task: PTTaskCreate) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export default function PTTaskForm({
    task,
    suggestedSortOrder = 1,
    onSubmit,
    onCancel,
    isLoading = false,
}: PTTaskFormProps) {
    const [formData, setFormData] = useState<PTTaskCreate>({
        title: "",
        maxMarks: 0,
        sortOrder: suggestedSortOrder,
    });

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title,
                maxMarks: task.maxMarks,
                sortOrder: task.sortOrder,
            });
        } else {
            setFormData({
                title: "",
                maxMarks: 0,
                sortOrder: suggestedSortOrder,
            });
        }
    }, [task, suggestedSortOrder]);

    const handleChange = (field: keyof PTTaskCreate, value: string | number) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const { title, maxMarks, sortOrder } = formData;
        if (!title || maxMarks < 0 || (sortOrder ?? 0) < 1) {
            return;
        }

        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder="e.g., 2.4 Km Run"
                    maxLength={160}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="maxMarks">Maximum Marks *</Label>
                <Input
                    id="maxMarks"
                    type="number"
                    min="0"
                    value={formData.maxMarks}
                    onChange={(e) => handleChange("maxMarks", Number(e.target.value))}
                    placeholder="e.g., 53"
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                    id="sortOrder"
                    type="number"
                    min="1"
                    value={formData.sortOrder}
                    onChange={(e) => handleChange("sortOrder", Math.max(1, Number(e.target.value) || 1))}
                    placeholder="1"
                />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {task ? "Save Changes" : "Create Task"}
                </Button>
            </div>
        </form>
    );
}
