"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Save } from "lucide-react";

export interface CampFormData {
    name: string;
    semester: "SEM5" | "SEM6A" | "SEM6B";
    maxTotalMarks: number;
}

interface CampFormProps {
    onSubmit: (data: CampFormData) => void;
    onCancel: () => void;
    isLoading?: boolean;
    initialData?: CampFormData;
    mode?: "create" | "edit";
}

export default function CampForm({
    onSubmit,
    onCancel,
    isLoading = false,
    initialData,
    mode = "create",
}: CampFormProps) {
    const [formData, setFormData] = useState<CampFormData>(
        initialData || {
            name: "",
            semester: "SEM5",
            maxTotalMarks: 100,
        }
    );

    // Update form data when initialData changes
    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleChange = (field: keyof CampFormData, value: string | number) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const { name, semester, maxTotalMarks } = formData;
        if (!name || !semester || maxTotalMarks < 0) {
            return;
        }

        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Camp Name */}
            <div className="space-y-2">
                <Label htmlFor="name">Camp Name *</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="e.g., Adventure Training Camp"
                    required
                    maxLength={120}
                />
            </div>

            {/* Semester */}
            <div className="space-y-2">
                <Label htmlFor="semester">Semester *</Label>
                <Select
                    value={formData.semester}
                    onValueChange={(value) => handleChange("semester", value)}
                >
                    <SelectTrigger id="semester">
                        <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="SEM5">Semester 5</SelectItem>
                        <SelectItem value="SEM6A">Semester 6A</SelectItem>
                        <SelectItem value="SEM6B">Semester 6B</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Max Total Marks */}
            <div className="space-y-2">
                <Label htmlFor="maxTotalMarks">Maximum Total Marks *</Label>
                <Input
                    id="maxTotalMarks"
                    type="number"
                    min="0"
                    value={formData.maxTotalMarks}
                    onChange={(e) => handleChange("maxTotalMarks", parseInt(e.target.value) || 0)}
                    placeholder="e.g., 100"
                    required
                />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isLoading}
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading
                        ? (mode === "edit" ? "Updating..." : "Creating...")
                        : (mode === "edit" ? "Update Camp" : "Create Camp")
                    }
                </Button>
            </div>
        </form>
    );
}

