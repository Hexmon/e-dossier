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
import PTTasksTable from "@/components/pt-mgmt/Pttaskstable";
import PTTaskForm from "@/components/pt-mgmt/Pttaskform";
import { PTType, PTTask, PTTaskCreate } from "@/app/lib/api/Physicaltrainingapi";

interface PTTasksTabProps {
    types: PTType[];
    tasks: PTTask[];
    selectedTypeId: string | null;
    loading: boolean;
    onTypeSelect: (typeId: string | null) => void;
    onAdd: (typeId: string, task: PTTaskCreate) => Promise<boolean>;
    onEdit: (typeId: string, taskId: string, task: PTTaskCreate) => Promise<boolean>;
    onDelete: (typeId: string, taskId: string) => Promise<boolean>;
    onManageScores: (task: PTTask) => void;
}

export default function PTTasksTab({
    types,
    tasks,
    selectedTypeId,
    loading,
    onTypeSelect,
    onAdd,
    onEdit,
    onDelete,
    onManageScores,
}: PTTasksTabProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<PTTask | undefined>(undefined);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    const selectedType = types.find((t) => t.id === selectedTypeId);

    const handleSubmit = async (data: PTTaskCreate) => {
        if (!selectedTypeId) return;

        const result = editingTask
            ? await onEdit(selectedTypeId, editingTask.id, data)
            : await onAdd(selectedTypeId, data);

        if (result) {
            setIsDialogOpen(false);
            setEditingTask(undefined);
        }
    };

    const handleEdit = (index: number) => {
        const task = tasks[index];
        if (task) {
            setEditingTask(task);
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

    const handleManageScores = (index: number) => {
        const task = tasks[index];
        if (task) {
            onManageScores(task);
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
                            Tasks for {selectedType?.code}
                        </h2>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setEditingTask(undefined);
                                setIsDialogOpen(true);
                            }}
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Task
                        </Button>
                    </div>

                    <PTTasksTable
                        tasks={tasks}
                        onEdit={handleEdit}
                        onDelete={handleDeleteClick}
                        onManageScores={handleManageScores}
                        loading={loading}
                    />
                </>
            ) : (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <p className="text-muted-foreground">
                                Please select a PT type to manage tasks
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
                            {editingTask ? "Edit Task" : "Add New Task"}
                        </DialogTitle>
                    </DialogHeader>
                    <PTTaskForm
                        task={editingTask}
                        onSubmit={handleSubmit}
                        onCancel={() => {
                            setIsDialogOpen(false);
                            setEditingTask(undefined);
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
                            This action cannot be undone. This will permanently delete the task
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