"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { Punishment, PunishmentCreate } from "@/app/lib/api/punishmentsApi";

interface PunishmentFormProps {
    punishment?: Punishment;
    onSubmit: (punishment: PunishmentCreate) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export default function PunishmentForm({
    punishment,
    onSubmit,
    onCancel,
    isLoading = false,
}: PunishmentFormProps) {
    const [formData, setFormData] = useState<PunishmentCreate>({
        title: "",
        marksDeduction: 0,
    });

    useEffect(() => {
        if (punishment) {
            const { id, createdAt, updatedAt, deletedAt, ...rest } = punishment;
            setFormData({
                title: rest.title || "",
                marksDeduction: rest.marksDeduction || 0,
            });
        } else {
            setFormData({
                title: "",
                marksDeduction: 0,
            });
        }
    }, [punishment]);

    const handleChange = (field: keyof PunishmentCreate, value: string | number) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const { title, marksDeduction } = formData;
        if (!title || marksDeduction < 0) {
            return;
        }

        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
                <Label htmlFor="title">Punishment Title *</Label>
                <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder="e.g., Extra PT, Late Arrival"
                    required
                />
            </div>

            {/* Marks Deduction */}
            <div className="space-y-2">
                <Label htmlFor="marksDeduction">Marks Deduction *</Label>
                <Input
                    id="marksDeduction"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.marksDeduction}
                    onChange={(e) => handleChange("marksDeduction", parseInt(e.target.value) || 0)}
                    placeholder="e.g., 5"
                    required
                />
                <p className="text-xs text-muted-foreground">
                    Number of marks to deduct for this punishment
                </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {punishment ? "Save Changes" : "Add Punishment"}
                </Button>
            </div>
        </form>
    );
}