"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { Instructor, InstructorCreate } from "@/app/lib/api/instructorsApi";

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
    const [formData, setFormData] = useState<InstructorCreate>({
        name: "",
        email: "",
        phone: "",
        affiliation: "",
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
                notes: rest.notes || "",
            });
        } else {
            setFormData({
                name: "",
                email: "",
                phone: "",
                affiliation: "",
                notes: "",
            });
        }
    }, [instructor]);

    const handleChange = (field: keyof InstructorCreate, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
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