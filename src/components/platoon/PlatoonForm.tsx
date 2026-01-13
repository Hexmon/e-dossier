"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Platoon, PlatoonFormData } from "@/types/platoon";

interface PlatoonFormProps {
    platoon?: Platoon;
    onSubmit: (data: PlatoonFormData) => void;
    onCancel: () => void;
}

export default function PlatoonForm({
    platoon,
    onSubmit,
    onCancel,
}: PlatoonFormProps) {
    const [formData, setFormData] = useState<PlatoonFormData>({
        key: "",
        name: "",
        about: "",
    });

    useEffect(() => {
        if (platoon) {
            const { key, name, about } = platoon;

            setFormData({
                key: key ?? "",
                name: name ?? "",
                about: about ?? "",
            });
        }
    }, [platoon]);

    const handleChange = (
        field: keyof PlatoonFormData,
        value: string
    ) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const isEditMode = Boolean(platoon);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="key">Platoon Key</Label>
                <Input
                    id="key"
                    value={formData.key}
                    onChange={(e) => handleChange("key", e.target.value)}
                    placeholder="Enter unique platoon key (e.g., KARNA)"
                    disabled={isEditMode}
                    required
                />
                {isEditMode && (
                    <p className="text-xs text-muted-foreground">
                        Key cannot be changed after creation
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="name">Platoon Name</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Enter platoon name"
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="about">About</Label>
                <Textarea
                    id="about"
                    value={formData.about}
                    onChange={(e) => handleChange("about", e.target.value)}
                    placeholder="Enter platoon description"
                    rows={4}
                />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit">
                    {isEditMode ? "Update" : "Create"}
                </Button>
            </div>
        </form>
    );
}