"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ActivityFormData {
    name: string;
    defaultMaxMarks: number;
    sortOrder: number;
}

interface ActivityFormProps {
    onSubmit: (data: ActivityFormData) => void;
    isLoading?: boolean;
    initialData?: ActivityFormData;
    mode?: "create" | "edit";
}

export default function ActivityForm({
    onSubmit,
    isLoading = false,
    initialData,
    mode = "create",
}: ActivityFormProps) {
    const [formData, setFormData] = useState<ActivityFormData>({
        name: "",
        defaultMaxMarks: 0,
        sortOrder: 0,
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="activity-name">Activity Name *</Label>
                <Input
                    id="activity-name"
                    type="text"
                    placeholder="Enter activity name"
                    value={formData.name}
                    onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    maxLength={160}
                    disabled={isLoading}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="default-max-marks">Default Max Marks *</Label>
                <Input
                    id="default-max-marks"
                    type="number"
                    placeholder="Enter default max marks"
                    value={formData.defaultMaxMarks}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            defaultMaxMarks: parseInt(e.target.value) || 0,
                        })
                    }
                    required
                    min={0}
                    disabled={isLoading}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="sort-order">Sort Order</Label>
                <Input
                    id="sort-order"
                    type="number"
                    placeholder="Enter sort order (default: 0)"
                    value={formData.sortOrder}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            sortOrder: parseInt(e.target.value) || 0,
                        })
                    }
                    min={0}
                    disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                    Lower numbers appear first in the list
                </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="submit" disabled={isLoading}>
                    {isLoading
                        ? mode === "create"
                            ? "Creating..."
                            : "Updating..."
                        : mode === "create"
                        ? "Create Activity"
                        : "Update Activity"}
                </Button>
            </div>
        </form>
    );
}

