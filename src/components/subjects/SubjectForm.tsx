"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Save } from "lucide-react";
import { Subject, SubjectCreate } from "@/app/lib/api/subjectsApi";

interface SubjectFormProps {
    subject?: Subject;
    onSubmit: (subject: SubjectCreate) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export default function SubjectForm({
    subject,
    onSubmit,
    onCancel,
    isLoading = false,
}: SubjectFormProps) {
    const [formData, setFormData] = useState<SubjectCreate>({
        code: "",
        name: "",
        branch: "C",
        hasTheory: true,
        hasPractical: false,
        defaultTheoryCredits: 0,
        defaultPracticalCredits: 0,
        description: "",
    });

    useEffect(() => {
        if (subject) {
            const { id, ...rest } = subject;
            setFormData(rest);
        } else {
            setFormData({
                code: "",
                name: "",
                branch: "C",
                hasTheory: true,
                hasPractical: false,
                defaultTheoryCredits: 0,
                defaultPracticalCredits: 0,
                description: "",
            });
        }
    }, [subject]);

    const handleChange = (field: keyof SubjectCreate, value: string | number | boolean) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const { code, name } = formData;
        if (!code || !name) {
            return;
        }

        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Subject Code */}
            <div className="space-y-2">
                <Label htmlFor="code">Subject Code *</Label>
                <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => handleChange("code", e.target.value)}
                    placeholder="e.g., PHY101"
                    required
                />
            </div>

            {/* Subject Name */}
            <div className="space-y-2">
                <Label htmlFor="name">Subject Name *</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="e.g., Physics I"
                    required
                />
            </div>

            {/* Branch */}
            <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Select
                    value={formData.branch}
                    onValueChange={(value) => handleChange("branch", value)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="C">Common</SelectItem>
                        <SelectItem value="E">Electronics</SelectItem>
                        <SelectItem value="M">Mechanical</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Has Theory */}
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="hasTheory"
                    checked={formData.hasTheory}
                    onCheckedChange={(checked) => handleChange("hasTheory", !!checked)}
                />
                <Label htmlFor="hasTheory" className="cursor-pointer">Has Theory</Label>
            </div>

            {/* Theory Credits */}
            {formData.hasTheory && (
                <div className="space-y-2">
                    <Label htmlFor="theoryCredits">Theory Credits</Label>
                    <Input
                        id="theoryCredits"
                        type="number"
                        value={formData.defaultTheoryCredits}
                        onChange={(e) => handleChange("defaultTheoryCredits", parseInt(e.target.value) || 0)}
                        placeholder="3"
                        min="0"
                    />
                </div>
            )}

            {/* Has Practical */}
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="hasPractical"
                    checked={formData.hasPractical}
                    onCheckedChange={(checked) => handleChange("hasPractical", !!checked)}
                />
                <Label htmlFor="hasPractical" className="cursor-pointer">Has Practical</Label>
            </div>

            {/* Practical Credits */}
            {formData.hasPractical && (
                <div className="space-y-2">
                    <Label htmlFor="practicalCredits">Practical Credits</Label>
                    <Input
                        id="practicalCredits"
                        type="number"
                        value={formData.defaultPracticalCredits}
                        onChange={(e) => handleChange("defaultPracticalCredits", parseInt(e.target.value) || 0)}
                        placeholder="1"
                        min="0"
                    />
                </div>
            )}

            {/* Description */}
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={formData.description || ""}
                    onChange={(e) => handleChange("description", e.target.value)}
                    placeholder="Enter subject description..."
                    className="min-h-[100px]"
                />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {subject ? "Save Changes" : "Add Subject"}
                </Button>
            </div>
        </form>
    );
}