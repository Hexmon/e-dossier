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
    semester: 1 | 2 | 3 | 4 | 5 | 6;
    sortOrder: number;
    maxTotalMarks: number;
    performanceTitle?: string | null;
    performanceGuidance?: string | null;
    signaturePrimaryLabel?: string | null;
    signatureSecondaryLabel?: string | null;
    noteLine1?: string | null;
    noteLine2?: string | null;
    showAggregateSummary?: boolean;
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
            semester: 1,
            sortOrder: 1,
            maxTotalMarks: 100,
            performanceTitle: "Performance during Camp.",
            performanceGuidance: "",
            signaturePrimaryLabel: "OIC Camp",
            signatureSecondaryLabel: "PI Cdr",
            noteLine1: "The above marks will be filled based on analysis of conduct of OC during Camp.",
            noteLine2: "Copy of mutual assessment during camp to be kept in dossier.",
            showAggregateSummary: false,
        }
    );

    // Update form data when initialData changes
    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleChange = (field: keyof CampFormData, value: string | number | boolean | null) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const { name, semester, maxTotalMarks, sortOrder } = formData;
        if (!name || !semester || maxTotalMarks < 0 || sortOrder < 1) {
            return;
        }

        onSubmit({
            ...formData,
            performanceTitle: formData.performanceTitle?.trim() || null,
            performanceGuidance: formData.performanceGuidance?.trim() || null,
            signaturePrimaryLabel: formData.signaturePrimaryLabel?.trim() || null,
            signatureSecondaryLabel: formData.signatureSecondaryLabel?.trim() || null,
            noteLine1: formData.noteLine1?.trim() || null,
            noteLine2: formData.noteLine2?.trim() || null,
        });
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
                    value={String(formData.semester)}
                    onValueChange={(value) =>
                        handleChange("semester", Number(value) as CampFormData["semester"])
                    }
                >
                    <SelectTrigger id="semester">
                        <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1">Semester 1 (First Term)</SelectItem>
                        <SelectItem value="2">Semester 2 (Second Term)</SelectItem>
                        <SelectItem value="3">Semester 3 (Third Term)</SelectItem>
                        <SelectItem value="4">Semester 4 (Fourth Term)</SelectItem>
                        <SelectItem value="5">Semester 5 (Fifth Term)</SelectItem>
                        <SelectItem value="6">Semester 6 (Sixth Term)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order *</Label>
                <Input
                    id="sortOrder"
                    type="number"
                    min="1"
                    value={formData.sortOrder}
                    onChange={(e) => handleChange("sortOrder", parseInt(e.target.value, 10) || 1)}
                    required
                />
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

            <div className="space-y-2">
                <Label htmlFor="performanceTitle">Performance Title</Label>
                <Input
                    id="performanceTitle"
                    value={formData.performanceTitle ?? ""}
                    onChange={(e) => handleChange("performanceTitle", e.target.value)}
                    placeholder="e.g., Performance during Camp."
                    maxLength={200}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="performanceGuidance">Performance Guidance</Label>
                <Input
                    id="performanceGuidance"
                    value={formData.performanceGuidance ?? ""}
                    onChange={(e) => handleChange("performanceGuidance", e.target.value)}
                    placeholder="Additional guidance shown under the title"
                    maxLength={2000}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="signaturePrimaryLabel">Primary Signature Label</Label>
                    <Input
                        id="signaturePrimaryLabel"
                        value={formData.signaturePrimaryLabel ?? ""}
                        onChange={(e) => handleChange("signaturePrimaryLabel", e.target.value)}
                        placeholder="e.g., OIC Camp"
                        maxLength={120}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="signatureSecondaryLabel">Secondary Signature Label</Label>
                    <Input
                        id="signatureSecondaryLabel"
                        value={formData.signatureSecondaryLabel ?? ""}
                        onChange={(e) => handleChange("signatureSecondaryLabel", e.target.value)}
                        placeholder="e.g., PI Cdr"
                        maxLength={120}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="noteLine1">Note Line 1</Label>
                <Input
                    id="noteLine1"
                    value={formData.noteLine1 ?? ""}
                    onChange={(e) => handleChange("noteLine1", e.target.value)}
                    maxLength={500}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="noteLine2">Note Line 2</Label>
                <Input
                    id="noteLine2"
                    value={formData.noteLine2 ?? ""}
                    onChange={(e) => handleChange("noteLine2", e.target.value)}
                    maxLength={500}
                />
            </div>

            <label className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={Boolean(formData.showAggregateSummary)}
                    onChange={(e) => handleChange("showAggregateSummary", e.target.checked)}
                />
                Show aggregate summary table on OC camp page
            </label>

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
