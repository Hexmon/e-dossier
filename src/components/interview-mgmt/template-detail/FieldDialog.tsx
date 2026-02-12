// components/interview-mgmt/template-detail/FieldDialog.tsx
"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Save } from "lucide-react";
import { Field, FieldCreate } from "@/app/lib/api/Interviewtemplateapi";

interface FieldDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: FieldCreate) => void;
    field?: Field;
    isLoading?: boolean;
}

const FIELD_TYPES = [
    { value: "text", label: "Text" },
    { value: "textarea", label: "Text Area" },
    { value: "date", label: "Date" },
    { value: "number", label: "Number" },
    { value: "checkbox", label: "Checkbox" },
    { value: "select", label: "Select/Dropdown" },
    { value: "signature", label: "Signature" },
];

export default function FieldDialog({
    open,
    onOpenChange,
    onSubmit,
    field,
    isLoading,
}: FieldDialogProps) {
    const [formData, setFormData] = useState<FieldCreate>({
        key: "",
        label: "",
        fieldType: "text",
        required: false,
        sortOrder: 0,
        captureFiledAt: true,
        captureSignature: false,
    });

    useEffect(() => {
        if (field) {
            setFormData({
                key: field.key,
                label: field.label,
                fieldType: field.fieldType,
                required: field.required,
                sortOrder: field.sortOrder,
                captureFiledAt: field.captureFiledAt,
                captureSignature: field.captureSignature,
            });
        } else {
            setFormData({
                key: "",
                label: "",
                fieldType: "text",
                required: false,
                sortOrder: 0,
                captureFiledAt: true,
                captureSignature: false,
            });
        }
    }, [field, open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {field ? "Edit Field" : "Create New Field"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="key">Field Key *</Label>
                        <Input
                            id="key"
                            value={formData.key}
                            onChange={(e) =>
                                setFormData({ ...formData, key: e.target.value })
                            }
                            placeholder="e.g., appearance_bg_comm"
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            Unique identifier (use lowercase with underscores)
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="label">Field Label *</Label>
                        <Input
                            id="label"
                            value={formData.label}
                            onChange={(e) =>
                                setFormData({ ...formData, label: e.target.value })
                            }
                            placeholder="e.g., Appearance, Bg and Comm Skills"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fieldType">Field Type *</Label>
                        <Select
                            value={formData.fieldType}
                            onValueChange={(value) =>
                                setFormData({ ...formData, fieldType: value })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select field type" />
                            </SelectTrigger>
                            <SelectContent>
                                {FIELD_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="sortOrder">Sort Order</Label>
                        <Input
                            id="sortOrder"
                            type="number"
                            min="0"
                            value={formData.sortOrder || 0}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    sortOrder: parseInt(e.target.value) || 0,
                                })
                            }
                        />
                    </div>

                    <div className="flex items-center justify-between space-y-0 rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="required">Required Field</Label>
                            <p className="text-xs text-muted-foreground">
                                Make this field mandatory
                            </p>
                        </div>
                        <Switch
                            id="required"
                            checked={formData.required}
                            onCheckedChange={(checked) =>
                                setFormData({ ...formData, required: checked })
                            }
                        />
                    </div>

                    <div className="flex items-center justify-between space-y-0 rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="captureFiledAt">Capture Filed At</Label>
                            <p className="text-xs text-muted-foreground">
                                Capture when this field was filled
                            </p>
                        </div>
                        <Switch
                            id="captureFiledAt"
                            checked={formData.captureFiledAt}
                            onCheckedChange={(checked) =>
                                setFormData({ ...formData, captureFiledAt: checked })
                            }
                        />
                    </div>

                    <div className="flex items-center justify-between space-y-0 rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="captureSignature">Capture Signature</Label>
                            <p className="text-xs text-muted-foreground">
                                Capture name, rank, and appointment with date
                            </p>
                        </div>
                        <Switch
                            id="captureSignature"
                            checked={formData.captureSignature}
                            onCheckedChange={(checked) =>
                                setFormData({ ...formData, captureSignature: checked })
                            }
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            <Save className="h-4 w-4 mr-2" />
                            {field ? "Save Changes" : "Create Field"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}