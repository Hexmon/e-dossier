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
import PTTypesTable from "@/components/pt-mgmt/PTTypesTable";
import PTTypeForm from "@/components/pt-mgmt/Pttypeform";
import { PTType, PTTypeCreate } from "@/app/lib/api/Physicaltrainingapi";

interface PTTypesTabProps {
    semester: number;
    types: PTType[];
    loading: boolean;
    onAdd: (type: PTTypeCreate) => Promise<boolean>;
    onEdit: (id: string, type: PTTypeCreate) => Promise<boolean>;
    onDelete: (id: string) => Promise<boolean>;
}

export default function PTTypesTab({
    semester,
    types,
    loading,
    onAdd,
    onEdit,
    onDelete,
}: PTTypesTabProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<PTType | undefined>(undefined);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    const handleSubmit = async (data: PTTypeCreate) => {
        const result = editingType
            ? await onEdit(editingType.id, data)
            : await onAdd(data);

        if (result) {
            setIsDialogOpen(false);
            setEditingType(undefined);
        }
    };

    const handleEdit = (index: number) => {
        const type = types[index];
        if (type) {
            setEditingType(type);
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
                    PT Types - Semester {semester}
                </h2>
                <Button
                    variant="outline"
                    onClick={() => {
                        setEditingType(undefined);
                        setIsDialogOpen(true);
                    }}
                    className="flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add PT Type
                </Button>
            </div>

            <PTTypesTable
                types={types}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                loading={loading}
            />

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            {editingType ? "Edit PT Type" : "Add New PT Type"}
                        </DialogTitle>
                    </DialogHeader>
                    <PTTypeForm
                        type={editingType}
                        onSubmit={handleSubmit}
                        onCancel={() => {
                            setIsDialogOpen(false);
                            setEditingType(undefined);
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
                            This action cannot be undone. This will permanently delete the PT type
                            from the system.
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