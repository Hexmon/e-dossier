"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import PTMotivationFieldsTable from "@/components/pt-mgmt/PTMotivationFieldsTable";
import PTMotivationFieldForm from "@/components/pt-mgmt/Ptmotivationfieldform";
import { PTMotivationField, PTMotivationFieldCreate } from "@/app/lib/api/Physicaltrainingapi";

interface PTMotivationTabProps {
    semester: number;
    fields: PTMotivationField[];
    loading: boolean;
    onAdd: (field: PTMotivationFieldCreate) => Promise<boolean>;
    onEdit: (id: string, field: PTMotivationFieldCreate) => Promise<boolean>;
    onDelete: (id: string) => Promise<boolean>;
}

export default function PTMotivationTab({
    semester,
    fields,
    loading,
    onAdd,
    onEdit,
    onDelete,
}: PTMotivationTabProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingField, setEditingField] = useState<PTMotivationField | undefined>(undefined);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    const handleSubmit = async (data: PTMotivationFieldCreate) => {
        const result = editingField
            ? await onEdit(editingField.id, data)
            : await onAdd(data);

        setIsDialogOpen(false);
        setEditingField(undefined);
    };

    const handleEdit = (index: number) => {
        const field = fields[index];
        if (field) {
            setEditingField(field);
            setIsDialogOpen(true);
        }
    };

    const handleDeleteClick = (id: string) => {
        setItemToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (itemToDelete) {
            await onDelete(itemToDelete);
        }
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">
                    Motivation Award Fields - Semester {semester}
                </h2>
                <Button
                    variant="outline"
                    onClick={() => {
                        setEditingField(undefined);
                        setIsDialogOpen(true);
                    }}
                    className="flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Field
                </Button>
            </div>

            <PTMotivationFieldsTable
                fields={fields}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                loading={loading}
            />

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            {editingField ? "Edit Motivation Field" : "Add New Motivation Field"}
                        </DialogTitle>
                    </DialogHeader>
                    <PTMotivationFieldForm
                        field={editingField}
                        onSubmit={handleSubmit}
                        onCancel={() => {
                            setIsDialogOpen(false);
                            setEditingField(undefined);
                        }}
                        isLoading={loading}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the
                            motivation field from the system.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setItemToDelete(null)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}