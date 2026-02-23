"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Save } from "lucide-react";
import { Instructor, InstructorCreate } from "@/app/lib/api/instructorsApi";
import { useSubjects } from "@/hooks/useSubjects";

interface InstructorFormProps {
    instructor?: Instructor;
    onSubmit: (instructor: InstructorCreate) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export default function InstructorForm({
    instructor,
    onSubmit,
    onCancel,
    isLoading = false,
}: InstructorFormProps) {
    const { loading: subjectsLoading, subjects } = useSubjects({ limit: 200 });
    const [formData, setFormData] = useState<InstructorCreate>({
        name: "",
        email: "",
        phone: "",
        affiliation: "",
        experience: "",
        qualification: "",
        subjectIds: [],
        notes: "",
    });

    useEffect(() => {
        if (instructor) {
            const { id, createdAt, updatedAt, deletedAt, ...rest } = instructor;
            setFormData({
                name: rest.name || "",
                email: rest.email || "",
                phone: rest.phone || "",
                affiliation: rest.affiliation || "",
                experience: rest.experience || "",
                qualification: rest.qualification || "",
                subjectIds: rest.subjectIds || [],
                notes: rest.notes || "",
            });
        } else {
            setFormData({
                name: "",
                email: "",
                phone: "",
                affiliation: "",
                experience: "",
                qualification: "",
                subjectIds: [],
                notes: "",
            });
        }
    }, [instructor]);

    const handleChange = (
        field: Exclude<keyof InstructorCreate, "subjectIds">,
        value: string
    ) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubjectToggle = (subjectId: string, checked: boolean) => {
        setFormData((prev) => {
            const current = prev.subjectIds || [];
            const subjectIds = checked
                ? Array.from(new Set([...current, subjectId]))
                : current.filter((id) => id !== subjectId);
            return { ...prev, subjectIds };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const { name, email, phone, affiliation } = formData;
        if (!name || !email || !phone || !affiliation) {
            return;
        }

        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="e.g., Capt Jane Smith"
                    required
                />
            </div>

            {/* Email */}
            <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="e.g., jane.smith@example.mil"
                    required
                />
            </div>

            {/* Phone */}
            <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="e.g., +1-555-0102"
                    required
                />
            </div>

            {/* Affiliation */}
            <div className="space-y-2">
                <Label htmlFor="affiliation">Affiliation *</Label>
                <Input
                    id="affiliation"
                    value={formData.affiliation}
                    onChange={(e) => handleChange("affiliation", e.target.value)}
                    placeholder="e.g., Infantry School"
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="experience">Experience</Label>
                <Textarea
                    id="experience"
                    value={formData.experience || ""}
                    onChange={(e) => handleChange("experience", e.target.value)}
                    placeholder="e.g., 8 years training cadets in fieldcraft and tactics"
                    className="min-h-[80px]"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="qualification">Qualification</Label>
                <Textarea
                    id="qualification"
                    value={formData.qualification || ""}
                    onChange={(e) => handleChange("qualification", e.target.value)}
                    placeholder="e.g., M.Tech, NCC Instructor Course, Weapons Training Certification"
                    className="min-h-[80px]"
                />
            </div>

            <div className="space-y-2">
                <Label>Subjects</Label>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between"
                        >
                            <span className="truncate text-left">
                                {(formData.subjectIds?.length || 0) > 0
                                    ? `${formData.subjectIds?.length} subject(s) selected`
                                    : "Select subjects"}
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-72">
                        <DropdownMenuLabel>Select one or more subjects</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {subjectsLoading ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                Loading subjects...
                            </div>
                        ) : subjects.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                No subjects available
                            </div>
                        ) : (
                            subjects.map((subject) => {
                                if (!subject.id) return null;
                                const checked = (formData.subjectIds || []).includes(subject.id);
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={subject.id}
                                        checked={checked}
                                        onSelect={(e) => e.preventDefault()}
                                        onCheckedChange={(value) =>
                                            handleSubjectToggle(subject.id!, value === true)
                                        }
                                    >
                                        <span className="truncate">
                                            {subject.code} - {subject.name}
                                        </span>
                                    </DropdownMenuCheckboxItem>
                                );
                            })
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                {(formData.subjectIds?.length || 0) > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {(formData.subjectIds || []).map((subjectId) => {
                            const subject = subjects.find((item) => item.id === subjectId);
                            return (
                                <Badge key={subjectId} variant="secondary">
                                    {subject ? `${subject.code} - ${subject.name}` : subjectId}
                                </Badge>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    placeholder="Additional notes about the instructor..."
                    className="min-h-[100px]"
                />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {instructor ? "Save Changes" : "Add Instructor"}
                </Button>
            </div>
        </form>
    );
}
