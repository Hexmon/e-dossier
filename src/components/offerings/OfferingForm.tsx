"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Save, Plus, Trash2 } from "lucide-react";
import { Offering, OfferingCreate, OfferingInstructor } from "@/app/lib/api/offeringsApi";

interface OfferingFormProps {
    offering?: Offering;
    onSubmit: (offering: OfferingCreate) => void;
    onCancel: () => void;
    isLoading?: boolean;
    subjects?: Array<{ id: string; code: string; name: string }>;
    instructors?: Array<{ id: string; name: string; email: string }>;
}

export default function OfferingForm({
    offering,
    onSubmit,
    onCancel,
    isLoading = false,
    subjects = [],
    instructors = [],
}: OfferingFormProps) {
    const [formData, setFormData] = useState<OfferingCreate>({
        subjectId: "",
        semester: 1,
        includeTheory: true,
        includePractical: false,
        theoryCredits: 0,
        practicalCredits: null,
        instructors: [],
    });

    useEffect(() => {
        if (offering) {
            const { id, courseId, subjectCode, subjectName, createdAt, updatedAt, deletedAt, ...rest } = offering;
            setFormData({
                subjectId: rest.subjectId || "",
                semester: rest.semester || 1,
                includeTheory: rest.includeTheory ?? true,
                includePractical: rest.includePractical ?? false,
                theoryCredits: rest.theoryCredits || 0,
                practicalCredits: rest.practicalCredits || null,
                instructors: rest.instructors || [],
            });
        } else {
            setFormData({
                subjectId: "",
                semester: 1,
                includeTheory: true,
                includePractical: false,
                theoryCredits: 0,
                practicalCredits: null,
                instructors: [],
            });
        }
    }, [offering]);

    const handleChange = (field: keyof OfferingCreate, value: string | number | boolean | null | OfferingInstructor[]) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleAddInstructor = () => {
        const newInstructor: OfferingInstructor = {
            instructorId: "",
            role: "ASSISTANT",
        };
        setFormData((prev) => ({
            ...prev,
            instructors: [...prev.instructors, newInstructor],
        }));
    };

    const handleRemoveInstructor = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            instructors: prev.instructors.filter((_, i) => i !== index),
        }));
    };

    const handleInstructorChange = (index: number, field: keyof OfferingInstructor, value: string) => {
        setFormData((prev) => {
            const updatedInstructors = [...prev.instructors];
            updatedInstructors[index] = {
                ...updatedInstructors[index],
                [field]: value,
            };
            return {
                ...prev,
                instructors: updatedInstructors,
            };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const { subjectId, semester, instructors: offeringInstructors } = formData;
        if (!subjectId || !semester) {
            return;
        }

        // Validate instructors
        const hasInvalidInstructor = offeringInstructors.some((inst) => !inst.instructorId);
        if (hasInvalidInstructor) {
            return;
        }

        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Subject */}
            <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Select
                    value={formData.subjectId}
                    onValueChange={(value) => handleChange("subjectId", value)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                        {subjects.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">No subjects available</div>
                        ) : (
                            subjects.map((subject) => {
                                const { id = "", code = "", name = "" } = subject;
                                return (
                                    <SelectItem key={id} value={id}>
                                        {code} - {name}
                                    </SelectItem>
                                );
                            })
                        )}
                    </SelectContent>
                </Select>
            </div>

            {/* Semester */}
            <div className="space-y-2">
                <Label htmlFor="semester">Semester *</Label>
                <Select
                    value={String(formData.semester)}
                    onValueChange={(value) => handleChange("semester", parseInt(value))}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                            <SelectItem key={sem} value={String(sem)}>
                                Semester {sem}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Include Theory */}
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="includeTheory"
                    checked={formData.includeTheory}
                    onCheckedChange={(checked) => handleChange("includeTheory", !!checked)}
                />
                <Label htmlFor="includeTheory" className="cursor-pointer">Include Theory</Label>
            </div>

            {/* Theory Credits */}
            {formData.includeTheory && (
                <div className="space-y-2">
                    <Label htmlFor="theoryCredits">Theory Credits</Label>
                    <Input
                        id="theoryCredits"
                        type="number"
                        value={formData.theoryCredits}
                        onChange={(e) => handleChange("theoryCredits", parseInt(e.target.value) || 0)}
                        placeholder="3"
                        min="0"
                    />
                </div>
            )}

            {/* Include Practical */}
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="includePractical"
                    checked={formData.includePractical}
                    onCheckedChange={(checked) => handleChange("includePractical", !!checked)}
                />
                <Label htmlFor="includePractical" className="cursor-pointer">Include Practical</Label>
            </div>

            {/* Practical Credits */}
            {formData.includePractical && (
                <div className="space-y-2">
                    <Label htmlFor="practicalCredits">Practical Credits</Label>
                    <Input
                        id="practicalCredits"
                        type="number"
                        value={formData.practicalCredits || ""}
                        onChange={(e) => handleChange("practicalCredits", parseInt(e.target.value) || null)}
                        placeholder="1"
                        min="0"
                    />
                </div>
            )}

            {/* Instructors */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label>Instructors</Label>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddInstructor}
                        className="h-8"
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Instructor
                    </Button>
                </div>

                {formData.instructors.length === 0 ? (
                    <div className="text-sm text-muted-foreground border border-dashed rounded-md p-4 text-center">
                        No instructors added. Click "Add Instructor" to assign instructors.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {formData.instructors.map((instructor, index) => {
                            const { instructorId = "", role = "SECONDARY" } = instructor;
                            return (
                                <div key={index} className="flex gap-2 items-start p-3 border rounded-md">
                                    <div className="flex-1 space-y-2">
                                        <Select
                                            value={instructorId}
                                            onValueChange={(value) => handleInstructorChange(index, "instructorId", value)}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Select instructor" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {instructors.length === 0 ? (
                                                    <div className="p-2 text-sm text-muted-foreground">
                                                        No instructors available
                                                    </div>
                                                ) : (
                                                    instructors.map((inst) => {
                                                        const { id = "", name = "", email = "" } = inst;
                                                        return (
                                                            <SelectItem key={id} value={id}>
                                                                {name} ({email})
                                                            </SelectItem>
                                                        );
                                                    })
                                                )}
                                            </SelectContent>
                                        </Select>

                                        <Select
                                            value={role}
                                            onValueChange={(value) => handleInstructorChange(index, "role", value)}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PRIMARY">Primary</SelectItem>
                                                <SelectItem value="ASSISTANT">Assistant</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleRemoveInstructor(index)}
                                        className="h-9 w-9 text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {offering ? "Save Changes" : "Add Offering"}
                </Button>
            </div>
        </form>
    );
}