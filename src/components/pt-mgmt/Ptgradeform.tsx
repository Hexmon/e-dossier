"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { PTGrade, PTGradeCreate } from "@/app/lib/api/Physicaltrainingapi";

interface PTGradeFormProps {
    grade?: PTGrade;
    onSubmit: (grade: PTGradeCreate) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export default function PTGradeForm({
    grade,
    onSubmit,
    onCancel,
    isLoading = false,
}: PTGradeFormProps) {
    const [formData, setFormData] = useState<PTGradeCreate>({
        code: "",
        label: "",
        sortOrder: 1,
        isActive: true,
    });

    useEffect(() => {
        if (grade) {
            setFormData({
                code: grade.code,
                label: grade.label,
                sortOrder: grade.sortOrder,
                isActive: grade.isActive,
            });
        } else {
            setFormData({
                code: "",
                label: "",
                sortOrder: 1,
                isActive: true,
            });
        }
    }, [grade]);

    const handleChange = (field: keyof PTGradeCreate, value: string | number | boolean) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const { code, label } = formData;
        if (!code || !label) {
            return;
        }

        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => handleChange("code", e.target.value)}
                    placeholder="e.g., E"
                    maxLength={8}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="label">Label *</Label>
                <Input
                    id="label"
                    value={formData.label}
                    onChange={(e) => handleChange("label", e.target.value)}
                    placeholder="e.g., Excellent"
                    maxLength={64}
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
                    {grade ? "Save Changes" : "Create Grade"}
                </Button>
            </div>
        </form>
    );
}