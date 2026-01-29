"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import { PTType, PTAttempt, PTAttemptCreate } from "@/app/lib/api/Physicaltrainingapi";
import PTAttemptsTable from "./Ptattemptstable";
import PTAttemptForm from "./Ptattemptform";

interface PTAttemptsTabProps {
    types: PTType[];
    attempts: PTAttempt[];
    selectedTypeId: string | null;
    loading: boolean;
    onTypeSelect: (typeId: string | null) => void;
    onAdd: (typeId: string, attempt: PTAttemptCreate) => Promise<boolean>;
    onEdit: (typeId: string, attemptId: string, attempt: PTAttemptCreate) => Promise<boolean>;
    onDelete: (typeId: string, attemptId: string) => Promise<boolean>;
    onManageGrades: (attempt: PTAttempt) => void;
}

export default function PTAttemptsTab({
    types,
    attempts,
    selectedTypeId,
    loading,
    onTypeSelect,
    onAdd,
    onEdit,
    onDelete,
    onManageGrades,
}: PTAttemptsTabProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAttempt, setEditingAttempt] = useState<PTAttempt | undefined>(undefined);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    const selectedType = types.find((t) => t.id === selectedTypeId);

    const handleSubmit = async (data: PTAttemptCreate) => {
        if (!selectedTypeId) return;

        const result = editingAttempt
            ? await onEdit(selectedTypeId, editingAttempt.id, data)
            : await onAdd(selectedTypeId, data);

        if (result) {
            setIsDialogOpen(false);
            setEditingAttempt(undefined);
        }
    };

    const handleEdit = (index: number) => {
        const attempt = attempts[index];
        if (attempt) {
            setEditingAttempt(attempt);
            setIsDialogOpen(true);
        }
    };

    const handleDeleteClick = (id: string) => {
        setItemToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (itemToDelete && selectedTypeId) {
            await onDelete(selectedTypeId, itemToDelete);
        }
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
    };

    const handleManageGrades = (index: number) => {
        const attempt = attempts[index];
        if (attempt) {
            onManageGrades(attempt);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="flex-1">
                    <label className="text-sm font-medium">Select PT Type:</label>
                    <Select
                        value={selectedTypeId || ""}
                        onValueChange={(value) => onTypeSelect(value || null)}
                    >
                        <SelectTrigger className="w-full mt-2">
                            <SelectValue placeholder="Select a PT type" />
                        </SelectTrigger>
                        <SelectContent>
                            {types.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                    {type.code} - {type.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {selectedTypeId ? (
                <>
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-foreground">
                            Attempts for {selectedType?.code}
                        </h2>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setEditingAttempt(undefined);
                                setIsDialogOpen(true);
                            }}
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Attempt
                        </Button>
                    </div>

                    <PTAttemptsTable
                        attempts={attempts}
                        onEdit={handleEdit}
                        onDelete={handleDeleteClick}
                        onManageGrades={handleManageGrades}
                        loading={loading}
                    />
                </>
            ) : (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <p className="text-muted-foreground">
                                Please select a PT type to manage attempts
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            {editingAttempt ? "Edit Attempt" : "Add New Attempt"}
                        </DialogTitle>
                    </DialogHeader>
                    <PTAttemptForm
                        attempt={editingAttempt}
                        onSubmit={handleSubmit}
                        onCancel={() => {
                            setIsDialogOpen(false);
                            setEditingAttempt(undefined);
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
                            This action cannot be undone. This will permanently delete the attempt
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