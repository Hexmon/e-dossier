"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { PTType, PTTypeCreate } from "@/app/lib/api/Physicaltrainingapi";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface PTTypeFormProps {
    type?: PTType;
    onSubmit: (type: PTTypeCreate) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export default function PTTypeForm({ type, onSubmit, onCancel, isLoading = false }: PTTypeFormProps) {
    const [formData, setFormData] = useState<PTTypeCreate>({
        semester: 1,
        code: "",
        title: "",
        maxTotalMarks: 0,
        sortOrder: 1,
        isActive: true,
    });

    useEffect(() => {
        if (type) {
            setFormData({
                semester: type.semester,
                code: type.code,
                title: type.title,
                maxTotalMarks: type.maxTotalMarks,
                sortOrder: type.sortOrder,
                isActive: type.isActive,
            });
        } else {
            setFormData({
                semester: 1,
                code: "",
                title: "",
                maxTotalMarks: 0,
                sortOrder: 1,
                isActive: true,
            });
        }
    }, [type]);

    const handleChange = (field: keyof PTTypeCreate, value: string | number | boolean) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const { semester, code, title, maxTotalMarks } = formData;
        if (!semester || !code || !title || maxTotalMarks < 0) {
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
                <Label htmlFor="code">Code *</Label>
                <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => handleChange("code", e.target.value)}
                    placeholder="e.g., PPT"
                    maxLength={32}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder="e.g., PPT (150 Marks)"
                    maxLength={160}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="maxTotalMarks">Maximum Total Marks *</Label>
                <Input
                    id="maxTotalMarks"
                    type="number"
                    min="0"
                    value={formData.maxTotalMarks}
                    onChange={(e) => handleChange("maxTotalMarks", Number(e.target.value))}
                    placeholder="e.g., 150"
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
                    {type ? "Save Changes" : "Create Type"}
                </Button>
            </div>
        </form>
    );
}