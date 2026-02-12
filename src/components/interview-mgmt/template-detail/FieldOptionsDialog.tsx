// components/interview-mgmt/template-detail/FieldOptionsDialog.tsx
"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Save } from "lucide-react";
import { useInterviewTemplates, QUERY_KEYS } from "@/hooks/useInterviewTemplates";
import { Field, FieldOption, FieldOptionCreate, listFieldOptions } from "@/app/lib/api/Interviewtemplateapi";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FieldOptionsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    templateId: string;
    field: Field;
}

export default function FieldOptionsDialog({
    open,
    onOpenChange,
    templateId,
    field,
}: FieldOptionsDialogProps) {
    const queryClient = useQueryClient();
    const { addFieldOption, editFieldOption, removeFieldOption } = useInterviewTemplates();

    const { data: options = [], isLoading } = useQuery({
        queryKey: QUERY_KEYS.fieldOptions(templateId, field.id),
        queryFn: async () => {
            const data = await listFieldOptions(templateId, field.id);
            return data?.options ?? [];
        },
        enabled: open && templateId.length > 0 && field.id.length > 0,
        staleTime: 5 * 60 * 1000,
    });

    const invalidateOptions = () =>
        queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.fieldOptions(templateId, field.id),
        });

    // -------------------------------------------------------------------------
    // Local UI state
    // -------------------------------------------------------------------------
    const [isAdding, setIsAdding] = useState(false);
    const [editingOption, setEditingOption] = useState<FieldOption | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [optionToDelete, setOptionToDelete] = useState<string | null>(null);
    const [formData, setFormData] = useState<FieldOptionCreate>({
        code: "",
        label: "",
        sortOrder: 0,
    });

    const handleAddNew = () => {
        setEditingOption(null);
        setFormData({ code: "", label: "", sortOrder: 0 });
        setIsAdding(true);
    };

    const handleEdit = (option: FieldOption) => {
        setEditingOption(option);
        setFormData({
            code: option.code,
            label: option.label,
            sortOrder: option.sortOrder,
        });
        setIsAdding(true);
    };

    const handleDelete = (optionId: string) => {
        setOptionToDelete(optionId);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (optionToDelete) {
            try {
                await removeFieldOption(templateId, field.id, optionToDelete, false);
                await invalidateOptions();
            } catch {
            }
        }
        setDeleteDialogOpen(false);
        setOptionToDelete(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingOption) {
                await editFieldOption(templateId, field.id, editingOption.id, formData);
            } else {
                await addFieldOption(templateId, field.id, formData);
            }
            await invalidateOptions();
        } catch {
            return;
        }

        setIsAdding(false);
        setEditingOption(null);
        setFormData({ code: "", label: "", sortOrder: 0 });
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingOption(null);
        setFormData({ code: "", label: "", sortOrder: 0 });
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Manage Options - {field.label}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                                Add options for this select field
                            </p>
                            {!isAdding && (
                                <Button onClick={handleAddNew} size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Option
                                </Button>
                            )}
                        </div>

                        {isAdding && (
                            <form onSubmit={handleSubmit} className="space-y-3 p-4 border rounded-lg bg-accent/50">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="code">Code *</Label>
                                        <Input
                                            id="code"
                                            value={formData.code}
                                            onChange={(e) =>
                                                setFormData({ ...formData, code: e.target.value })
                                            }
                                            placeholder="e.g., EXCELLENT"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="label">Label *</Label>
                                        <Input
                                            id="label"
                                            value={formData.label}
                                            onChange={(e) =>
                                                setFormData({ ...formData, label: e.target.value })
                                            }
                                            placeholder="e.g., Excellent"
                                            required
                                        />
                                    </div>
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
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={handleCancel}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isLoading}>
                                        <Save className="h-4 w-4 mr-2" />
                                        {editingOption ? "Save Changes" : "Add Option"}
                                    </Button>
                                </div>
                            </form>
                        )}

                        {isLoading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            </div>
                        ) : options.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No options added yet</p>
                                {!isAdding && (
                                    <Button
                                        variant="outline"
                                        onClick={handleAddNew}
                                        className="mt-4"
                                    >
                                        Add First Option
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {options.map((option) => (
                                    <div
                                        key={option.id}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline">{option.code}</Badge>
                                            <span className="font-medium">{option.label}</span>
                                            <span className="text-xs text-muted-foreground">
                                                Order: {option.sortOrder}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(option)}
                                                disabled={isAdding}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(option.id)}
                                                className="text-destructive"
                                                disabled={isAdding}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Option</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this option? This will soft delete the option.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setOptionToDelete(null)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}