"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import {
    PTTaskScore,
    PTTaskScoreCreate,
    PTAttempt,
    PTGrade,
} from "@/app/lib/api/Physicaltrainingapi";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface PTTaskScoreFormProps {
    score?: PTTaskScore;
    attempts: PTAttempt[];
    grades: PTGrade[];
    onSubmit: (score: PTTaskScoreCreate) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export default function PTTaskScoreForm({
    score,
    attempts,
    grades,
    onSubmit,
    onCancel,
    isLoading = false,
}: PTTaskScoreFormProps) {
    const [formData, setFormData] = useState<PTTaskScoreCreate>({
        ptAttemptId: "",
        ptAttemptGradeId: "",
        maxMarks: 0,
    });

    // Get grades for selected attempt
    const availableGrades = grades.filter((g) => g.ptAttemptId === formData.ptAttemptId);

    useEffect(() => {
        console.log("PTTaskScoreForm - score prop changed:", score);

        if (score) {
            const newFormData = {
                ptAttemptId: score.ptAttemptId,
                ptAttemptGradeId: score.ptAttemptGradeId,
                maxMarks: score.maxMarks,
            };
            console.log("Setting form data for edit:", newFormData);
            setFormData(newFormData);
        } else {
            console.log("Resetting form data for new entry");
            setFormData({
                ptAttemptId: "",
                ptAttemptGradeId: "",
                maxMarks: 0,
            });
        }
    }, [score]);

    const handleChange = (field: keyof PTTaskScoreCreate, value: string | number) => {
        console.log(`Field changed: ${field} = ${value}`);

        setFormData((prev) => {
            const updated = {
                ...prev,
                [field]: value,
            };

            // Reset grade when attempt changes (only if not in edit mode)
            if (field === "ptAttemptId" && !score) {
                updated.ptAttemptGradeId = "";
            }

            console.log("Updated form data:", updated);
            return updated;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        console.log("Form submitted with data:", formData);

        const { ptAttemptId, ptAttemptGradeId, maxMarks } = formData;

        if (!ptAttemptId || !ptAttemptGradeId || maxMarks < 0) {
            console.error("Validation failed:", { ptAttemptId, ptAttemptGradeId, maxMarks });
            return;
        }

        console.log("Submitting valid data:", formData);
        onSubmit(formData);
    };

    // Helper to get attempt label
    const getAttemptLabel = (attemptId: string) => {
        const attempt = attempts.find((a) => a.id === attemptId);
        return attempt ? `${attempt.code} - ${attempt.label}${attempt.isCompensatory ? " (Compensatory)" : ""}` : "";
    };

    // Helper to get grade label
    const getGradeLabel = (gradeId: string) => {
        const grade = grades.find((g) => g.id === gradeId);
        return grade ? `${grade.code} - ${grade.label}` : "";
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="ptAttemptId">Attempt *</Label>
                {score ? (
                    // Show as read-only text when editing
                    <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                        {getAttemptLabel(formData.ptAttemptId)}
                    </div>
                ) : (
                    <Select
                        value={formData.ptAttemptId}
                        onValueChange={(value) => handleChange("ptAttemptId", value)}
                    >
                        <SelectTrigger id="ptAttemptId">
                            <SelectValue placeholder="Select attempt" />
                        </SelectTrigger>
                        <SelectContent>
                            {attempts.map((attempt) => (
                                <SelectItem key={attempt.id} value={attempt.id}>
                                    {attempt.code} - {attempt.label}
                                    {attempt.isCompensatory && " (Compensatory)"}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                {score && (
                    <p className="text-xs text-muted-foreground">
                        Cannot change attempt when editing
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="ptAttemptGradeId">Grade *</Label>
                {score ? (
                    // Show as read-only text when editing
                    <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                        {getGradeLabel(formData.ptAttemptGradeId)}
                    </div>
                ) : (
                    <Select
                        value={formData.ptAttemptGradeId}
                        onValueChange={(value) => handleChange("ptAttemptGradeId", value)}
                        disabled={!formData.ptAttemptId}
                    >
                        <SelectTrigger id="ptAttemptGradeId">
                            <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableGrades.map((grade) => (
                                <SelectItem key={grade.id} value={grade.id}>
                                    {grade.code} - {grade.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                {!score && !formData.ptAttemptId && (
                    <p className="text-xs text-muted-foreground">Select an attempt first</p>
                )}
                {score && (
                    <p className="text-xs text-muted-foreground">
                        Cannot change grade when editing
                    </p>
                )}
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
                <p className="text-xs text-muted-foreground">
                    For compensatory attempts, set this to 40% of task max marks
                </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {score ? "Save Changes" : "Create Score Entry"}
                </Button>
            </div>
        </form>
    );
}