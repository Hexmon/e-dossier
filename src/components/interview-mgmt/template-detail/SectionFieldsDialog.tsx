// Example SectionFieldsDialog.tsx
"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Settings } from "lucide-react";
import { useInterviewTemplates } from "@/hooks/useInterviewTemplates";
import { Section, Field } from "@/app/lib/api/Interviewtemplateapi";
import FieldDialog from "./FieldDialog";
import FieldOptionsDialog from "./FieldOptionsDialog";
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

interface SectionFieldsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    templateId: string;
    section: Section;
}

export default function SectionFieldsDialog({
    open,
    onOpenChange,
    templateId,
    section,
}: SectionFieldsDialogProps) {
    const {
        loading,
        fetchSectionFields,
        addSectionField,
        editField,
        removeField,
    } = useInterviewTemplates();

    const [fields, setFields] = useState<Field[]>([]);
    const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
    const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingField, setEditingField] = useState<Field | undefined>(undefined);
    const [selectedField, setSelectedField] = useState<Field | null>(null);
    const [fieldToDelete, setFieldToDelete] = useState<string | null>(null);

    useEffect(() => {
        if (open && section.id) {
            loadFields();
        }
    }, [open, section.id]);

    const loadFields = async () => {
        const result = await fetchSectionFields(templateId, section.id);
        setFields(result);
    };

    const handleAddField = () => {
        setEditingField(undefined);
        setFieldDialogOpen(true);
    };

    const handleEditField = (field: Field) => {
        setEditingField(field);
        setFieldDialogOpen(true);
    };

    const handleDeleteField = (fieldId: string) => {
        setFieldToDelete(fieldId);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (fieldToDelete) {
            await removeField(templateId, fieldToDelete, false);
            await loadFields();
        }
        setDeleteDialogOpen(false);
        setFieldToDelete(null);
    };

    const handleManageOptions = (field: Field) => {
        setSelectedField(field);
        setOptionsDialogOpen(true);
    };

    const handleFieldSubmit = async (data: any) => {
        if (editingField) {
            await editField(templateId, editingField.id, data);
        } else {
            await addSectionField(templateId, section.id, data);
        }
        await loadFields();
        setFieldDialogOpen(false);
        setEditingField(undefined);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Manage Fields - {section.title}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                                Add and manage fields for this section
                            </p>
                            <Button onClick={handleAddField} size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Field
                            </Button>
                        </div>

                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            </div>
                        ) : fields.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No fields added yet</p>
                                <Button
                                    variant="outline"
                                    onClick={handleAddField}
                                    className="mt-4"
                                >
                                    Add First Field
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {fields.map((field) => (
                                    <div
                                        key={field.id}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium">{field.label}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {field.fieldType}
                                                </Badge>
                                                {field.required && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        Required
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Key: {field.key} | Order: {field.sortOrder}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {field.fieldType === "select" && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleManageOptions(field)}
                                                >
                                                    <Settings className="h-4 w-4 mr-1" />
                                                    Options
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEditField(field)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteField(field.id)}
                                                className="text-destructive"
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

            <FieldDialog
                open={fieldDialogOpen}
                onOpenChange={setFieldDialogOpen}
                onSubmit={handleFieldSubmit}
                field={editingField}
                isLoading={loading}
            />

            {selectedField && (
                <FieldOptionsDialog
                    open={optionsDialogOpen}
                    onOpenChange={setOptionsDialogOpen}
                    templateId={templateId}
                    field={selectedField}
                />
            )}

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Field</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this field? This will soft delete the field.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setFieldToDelete(null)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}