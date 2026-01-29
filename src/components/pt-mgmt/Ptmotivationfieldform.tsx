"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import {
    PTMotivationField,
    PTMotivationFieldCreate,
} from "@/app/lib/api/Physicaltrainingapi";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface PTMotivationFieldFormProps {
    field?: PTMotivationField;
    onSubmit: (field: PTMotivationFieldCreate) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export default function PTMotivationFieldForm({
    field,
    onSubmit,
    onCancel,
    isLoading = false,
}: PTMotivationFieldFormProps) {
    const [formData, setFormData] = useState<PTMotivationFieldCreate>({
        semester: 1,
        label: "",
        sortOrder: 1,
        isActive: true,
    });

    useEffect(() => {
        if (field) {
            setFormData({
                semester: field.semester,
                label: field.label,
                sortOrder: field.sortOrder,
                isActive: field.isActive,
            });
        } else {
            setFormData({
                semester: 1,
                label: "",
                sortOrder: 1,
                isActive: true,
            });
        }
    }, [field]);

    const handleChange = (
        fieldKey: keyof PTMotivationFieldCreate,
        value: string | number | boolean
    ) => {
        setFormData((prev) => ({
            ...prev,
            [fieldKey]: value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const { semester, label } = formData;
        if (!semester || !label) {
            return;
        }

        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="semester">Semester *</Label>
                <Select
                    value={String(formData.semester)}
                    onValueChange={(value) => handleChange("semester", Number(value))}
                >
                    <SelectTrigger id="semester">
                        <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((sem) => (
                            <SelectItem key={sem} value={String(sem)}>
                                Semester {sem}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="label">Label *</Label>
                <Input
                    id="label"
                    value={formData.label}
                    onChange={(e) => handleChange("label", e.target.value)}
                    placeholder="e.g., Merit Card"
                    maxLength={160}
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
                    onChange={(e) => handleChange("sortOrder", Number(e.target.value))}
                    placeholder="1"
                />
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => handleChange("isActive", e.target.checked)}
                    className="h-4 w-4"
                />
                <Label htmlFor="isActive">Active</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {field ? "Save Changes" : "Create Field"}
                </Button>
            </div>
        </form>
    );
}